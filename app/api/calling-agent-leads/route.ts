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
 * Query params mirror the existing /api/leads endpoint where possible:
 *   page, pageSize, search (phone substring), dateFrom, dateTo,
 *   eventType ("lead" | "transfer"), agentId, campaignId, sort.
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
    const where: any = {}

    if (role === 'SUPERADMIN') {
      // no scope filter
    } else if (role === 'ADMIN') {
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { assignedUserIds: true },
      })
      const ids = adminUser?.assignedUserIds || []
      if (ids.length === 0) {
        where.crmUserId = { in: [] }
      } else {
        where.crmUserId = { in: ids }
      }
    } else {
      where.crmUserId = session.user.id
    }

    if (search) {
      where.customerPhone = { contains: search }
    }
    if (eventType === 'lead' || eventType === 'transfer') {
      where.eventType = eventType
    }
    if (agentId) {
      where.agentId = agentId
    }
    if (campaignId) {
      where.campaignId = campaignId
    }
    if (dateFrom || dateTo) {
      // The UI table sorts/displays callDateTime (fallback createdAt), so the
      // filter must use the same field — otherwise a call placed yesterday
      // but ingested today is wrongly excluded by a "yesterday" From/To.
      // Rows that never carried callDateTime fall back to createdAt so the
      // filter is non-leaky for legacy or ingest-only events.
      const range: { gte?: Date; lte?: Date } = {}
      if (dateFrom) range.gte = new Date(dateFrom)
      if (dateTo) range.lte = new Date(dateTo)
      where.OR = [
        { callDateTime: range },
        { AND: [{ callDateTime: null }, { createdAt: range }] },
      ]
    }

    const [sortField, sortOrderRaw] = sort.split(':')
    const sortOrder = sortOrderRaw === 'asc' ? 'asc' : 'desc'
    const safeSortFields = new Set(['createdAt', 'callDateTime', 'customerPhone', 'eventType'])
    const orderBy: any = {}
    orderBy[safeSortFields.has(sortField) ? sortField : 'createdAt'] = sortOrder

    const [items, total] = await Promise.all([
      prisma.callingAgentLead.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          crmUser: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.callingAgentLead.count({ where }),
    ])

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
