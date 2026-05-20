import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * List CallingAgentLead rows scoped by role:
 *   - USER       → only rows owned by the current crmUserId
 *   - ADMIN      → rows owned by their assignedUserIds
 *   - SUPERADMIN → all rows
 *
 * One row per phone number: when a phone has both a 'transfer' and a 'lead'
 * entry, the most recent 'transfer' wins; otherwise the most recent 'lead'.
 * Dedup runs server-side in MongoDB so pagination totals are correct and
 * duplicates can't leak across pages.
 *
 * Query params: page, pageSize, search (phone substring), dateFrom, dateTo,
 *               eventType ("lead" | "transfer"), agentId, campaignId, sort.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const pageSize = Math.min(
      Math.max(parseInt(searchParams.get('pageSize') || '20', 10), 1),
      100,
    )
    const search = (searchParams.get('search') || '').trim()
    const eventType = (searchParams.get('eventType') || '').trim()
    const agentId = (searchParams.get('agentId') || '').trim()
    const campaignId = (searchParams.get('campaignId') || '').trim()
    const dateFrom = (searchParams.get('dateFrom') || '').trim()
    const dateTo = (searchParams.get('dateTo') || '').trim()
    const sort = (searchParams.get('sort') || 'createdAt:desc').trim()

    const role = session.user.role

    // ── Scope filter (per-user / per-admin / superadmin) ──────────────────
    // Built as a Mongo $match stage so it runs inside the aggregation
    // pipeline alongside the dedup stages.
    const scopeMatch: Record<string, any> = {}
    if (role === 'SUPERADMIN') {
      // no scope filter
    } else if (role === 'ADMIN') {
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { assignedUserIds: true },
      })
      const ids = adminUser?.assignedUserIds || []
      if (ids.length === 0) {
        return NextResponse.json({
          items: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        })
      }
      scopeMatch.crmUserId = { $in: ids.map((id) => ({ $oid: id })) }
    } else {
      scopeMatch.crmUserId = { $oid: session.user.id }
    }

    // ── Pre-dedup filters ─────────────────────────────────────────────────
    // Date/agent/campaign filters narrow the candidate set BEFORE dedup.
    // eventType and phone search are deliberately NOT applied here:
    //   - eventType: winner-selection ("transfer wins over lead") needs to
    //     see both event types for each phone before picking the winner.
    //   - phone search: raw customerPhone strings vary in format
    //     ("+918879500104" vs "08879500104" vs "8879500104"). Searching the
    //     raw field would exclude rows from a phone group whose other
    //     entries DO match, breaking transfer-wins. Phone search runs
    //     against the normalized digit string AFTER it's computed.
    const preMatch: Record<string, any> = { ...scopeMatch }
    if (agentId) {
      preMatch.agentId = agentId
    }
    if (campaignId) {
      preMatch.campaignId = campaignId
    }
    if (dateFrom || dateTo) {
      const range: Record<string, any> = {}
      if (dateFrom) range.$gte = { $date: new Date(dateFrom).toISOString() }
      if (dateTo) range.$lte = { $date: new Date(dateTo).toISOString() }
      preMatch.$or = [
        { callDateTime: range },
        { $and: [{ callDateTime: null }, { createdAt: range }] },
      ]
    }

    // Build candidate substrings to match against the normalized phone.
    // The stored normalizedPhone is always strict digits with no leading
    // 91/0 (when length > 10). Partial search terms can be in any format,
    // so we generate every reasonable interpretation and match if ANY
    // hits as a substring. Example: search "0887" → candidates
    // ["0887","887"] (drop leading 0); "91887" → ["91887","887"]; partial
    // "+91 88" → ["9188","88"]. No $regex on user input — avoids regex
    // parse errors on pasted "+91..." strings and removes the
    // metacharacter attack surface.
    const searchCandidates = (() => {
      if (!search) return [] as string[]
      const digits = search.replace(/\D+/g, '')
      if (!digits) return []
      const set = new Set<string>()
      set.add(digits)
      if (digits.startsWith('91') && digits.length > 2) set.add(digits.slice(2))
      if (digits.startsWith('0')) {
        const stripped = digits.replace(/^0+/, '')
        if (stripped) set.add(stripped)
      }
      return Array.from(set)
    })()

    const [sortField, sortOrderRaw] = sort.split(':')
    const sortOrder = sortOrderRaw === 'asc' ? 1 : -1
    const safeSortFields = new Set(['createdAt', 'callDateTime', 'customerPhone', 'eventType'])
    const sortFieldSafe = safeSortFields.has(sortField) ? sortField : 'createdAt'

    // ── Dedup + pagination pipeline ───────────────────────────────────────
    // 1. $match: scope + pre-dedup filters (date/agent/campaign only)
    // 2. $addFields: normalizedPhone (strip non-digits, country code 91,
    //    leading trunk 0) so "+918879500104" / "08879500104" / "8879500104"
    //    all hash to the same group. sortTs picks callDateTime else
    //    createdAt — same fallback the UI uses. transferRank=0 for
    //    transfers, 1 for everything else, so transfers sort first.
    // 3. POST-normalization $match for phone search: substring match
    //    against the normalized digit string. Runs BEFORE dedup so a phone
    //    survives if ANY of its raw-format variants matched — but AFTER
    //    normalization so format differences don't exclude legitimate
    //    matches.
    // 4. $sort: per-group ordering so the WINNING row lands first inside
    //    each $group bucket.
    // 5. $group: collapse by normalizedPhone, keeping the first doc.
    //    Phones that are blank/missing are passed through unchanged
    //    (grouped by a unique fallback key) so they don't all collapse
    //    into one row.
    // 6. $replaceRoot: hoist the winning doc back to top level.
    // 7. POST-dedup $match for eventType. Semantics: "Lead" shows only
    //    phones whose WINNER is a lead — phones with a transfer winner
    //    are intentionally hidden because they already "belong to" the
    //    transfer category under the global transfer-wins-over-lead rule.
    //    Surfacing them under both views would reintroduce the per-phone
    //    duplication this whole pipeline exists to prevent.
    // 8. $sort by the requested field for final display order.
    // 9. $facet: items (skip/limit) + total (count) in one round-trip.
    const postDedupMatch: Record<string, any> = {}
    if (eventType === 'lead' || eventType === 'transfer') {
      postDedupMatch.eventType = eventType
    }

    const pipeline: Record<string, any>[] = [
      { $match: preMatch },
      {
        $addFields: {
          _digits: {
            $reduce: {
              input: { $range: [0, { $strLenCP: { $ifNull: ['$customerPhone', ''] } }] },
              initialValue: '',
              in: {
                $let: {
                  vars: {
                    ch: { $substrCP: [{ $ifNull: ['$customerPhone', ''] }, '$$this', 1] },
                  },
                  in: {
                    $cond: [
                      // Keep only ASCII digits. Comparing the single-char
                      // substring against '0'..'9' lexicographically is
                      // cheaper than $regexMatch and avoids the JS regex
                      // literal getting serialized to {} over the wire to
                      // Mongo (which was the previous bug).
                      {
                        $and: [
                          { $gte: ['$$ch', '0'] },
                          { $lte: ['$$ch', '9'] },
                        ],
                      },
                      { $concat: ['$$value', '$$ch'] },
                      '$$value',
                    ],
                  },
                },
              },
            },
          },
          sortTs: { $ifNull: ['$callDateTime', '$createdAt'] },
          transferRank: { $cond: [{ $eq: ['$eventType', 'transfer'] }, 0, 1] },
        },
      },
      {
        $addFields: {
          normalizedPhone: {
            $let: {
              vars: {
                stripped91: {
                  $cond: [
                    {
                      $and: [
                        { $gt: [{ $strLenCP: '$_digits' }, 10] },
                        { $eq: [{ $substrCP: ['$_digits', 0, 2] }, '91'] },
                      ],
                    },
                    { $substrCP: ['$_digits', 2, { $strLenCP: '$_digits' }] },
                    '$_digits',
                  ],
                },
              },
              in: {
                $cond: [
                  {
                    $and: [
                      { $gt: [{ $strLenCP: '$$stripped91' }, 10] },
                      { $eq: [{ $substrCP: ['$$stripped91', 0, 1] }, '0'] },
                    ],
                  },
                  {
                    $substrCP: [
                      '$$stripped91',
                      1,
                      { $strLenCP: '$$stripped91' },
                    ],
                  },
                  '$$stripped91',
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          // Rows without a usable phone get a unique group key so they
          // pass through without collapsing into a single bucket.
          _groupKey: {
            $cond: [
              { $eq: ['$normalizedPhone', ''] },
              { $concat: ['__no_phone__:', { $toString: '$_id' }] },
              '$normalizedPhone',
            ],
          },
        },
      },
      // Phone search on the normalized digit string. Matches if ANY of the
      // candidate forms (raw digits, sans-leading-0, sans-leading-91) is a
      // substring of normalizedPhone. $indexOfCP returns -1 on no-match —
      // $gte 0 keeps it a "contains" search rather than exact match,
      // mirroring the old UX. Skipped entirely when no search term is
      // provided.
      ...(searchCandidates.length > 0
        ? [
            {
              $match: {
                $expr: {
                  $or: searchCandidates.map((term) => ({
                    $gte: [{ $indexOfCP: ['$normalizedPhone', term] }, 0],
                  })),
                },
              },
            },
          ]
        : []),
      { $sort: { _groupKey: 1, transferRank: 1, sortTs: -1 } },
      {
        $group: {
          _id: '$_groupKey',
          doc: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
      ...(Object.keys(postDedupMatch).length > 0 ? [{ $match: postDedupMatch }] : []),
      { $sort: { [sortFieldSafe]: sortOrder } },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
            {
              $project: {
                _digits: 0,
                sortTs: 0,
                transferRank: 0,
                normalizedPhone: 0,
                _groupKey: 0,
              },
            },
          ],
          totalArr: [{ $count: 'n' }],
        },
      },
    ]

    const raw = (await prisma.callingAgentLead.aggregateRaw({
      pipeline,
    })) as unknown as Array<{
      items: any[]
      totalArr: Array<{ n: number }>
    }>

    const facetResult = Array.isArray(raw) && raw[0] ? raw[0] : { items: [], totalArr: [] }
    const rawItems = facetResult.items || []
    const total = facetResult.totalArr?.[0]?.n || 0

    // ── Map Mongo extended-JSON shapes back to the flat shape the UI expects ──
    // Also fetch owner User docs in a single round-trip so the `crmUser`
    // join the table renders survives the move away from prisma.findMany().
    const ownerIds = Array.from(
      new Set(
        rawItems
          .map((r) => r?.crmUserId?.$oid || r?.crmUserId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    )
    const owners = ownerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, name: true, email: true },
        })
      : []
    const ownerById = new Map(owners.map((o) => [o.id, o]))

    const items = rawItems.map((doc) => {
      const id = doc?._id?.$oid || doc?._id
      const crmUserId = doc?.crmUserId?.$oid || doc?.crmUserId || null
      const callDateTime = doc?.callDateTime?.$date || doc?.callDateTime || null
      const createdAt = doc?.createdAt?.$date || doc?.createdAt || null
      const updatedAt = doc?.updatedAt?.$date || doc?.updatedAt || null
      const { _id, ...rest } = doc || {}
      return {
        ...rest,
        id,
        crmUserId,
        callDateTime,
        createdAt,
        updatedAt,
        crmUser: crmUserId ? ownerById.get(crmUserId) || null : null,
      }
    })

    const totalPages = Math.max(Math.ceil(total / pageSize), 1)

    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (err) {
    console.error('[CallingAgentLeads] list error', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
