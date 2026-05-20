'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Search, Eye } from 'lucide-react'

interface CallingAgentLead {
  id: string
  externalEventKey: string
  eventType: string
  externalCallId: string
  agentId?: string | null
  agentName?: string | null
  crmUserId?: string | null
  customerPhone: string
  campaignId?: string | null
  campaignName?: string | null
  callDateTime?: string | null
  duration?: number | null
  summary?: string | null
  transcriptJson?: string | null
  leadQualifierJson?: string | null
  leadReason?: string | null
  transferStatus?: string | null
  recordingStatus?: string | null
  createdAt: string
  crmUser?: { id: string; name: string | null; email: string } | null
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleString()
}

function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function safeParse(json?: string | null): unknown {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function CallingAgentLeadsTable() {
  const [rows, setRows] = useState<CallingAgentLead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eventType, setEventType] = useState<'' | 'lead' | 'transfer'>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [agentId, setAgentId] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<CallingAgentLead | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', '20')
      if (search) params.set('search', search)
      if (eventType) params.set('eventType', eventType)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (agentId) params.set('agentId', agentId)
      const res = await fetch(`/api/calling-agent-leads?${params.toString()}`)
      if (!res.ok) {
        setRows([])
        setPagination({
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        })
        return
      }
      const json = await res.json()
      setRows(json.items || [])
      setPagination(json.pagination || pagination)
    } catch (err) {
      console.error('[CallingAgentLeads] fetch failed', err)
      setRows([])
      setPagination({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, eventType, dateFrom, dateTo, agentId])

  useEffect(() => {
    const t = setTimeout(fetchRows, 250)
    return () => clearTimeout(t)
  }, [fetchRows])

  // ── Realtime push: subscribe to /api/calling-agent-leads/stream ──
  // SSE only triggers a refetch — the list endpoint enforces scoping. The
  // server may fire many events in a short burst (e.g. a transfer event
  // arriving right after a lead event for the same call), so debounce
  // refetches to coalesce them into one network request.
  const fetchRowsRef = useRef(fetchRows)
  useEffect(() => {
    fetchRowsRef.current = fetchRows
  }, [fetchRows])

  const [liveConnected, setLiveConnected] = useState(false)

  useEffect(() => {
    // Guard for SSR / non-browser environments.
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return
    }

    const es = new EventSource('/api/calling-agent-leads/stream')
    let refetchTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleRefetch = () => {
      if (refetchTimer) clearTimeout(refetchTimer)
      refetchTimer = setTimeout(() => {
        refetchTimer = null
        // Read the latest fetchRows via ref so this effect does not need
        // filter/page deps and we don't reopen the SSE on every keystroke.
        fetchRowsRef.current()
      }, 400)
    }

    const onOpen = () => setLiveConnected(true)
    const onError = () => {
      // EventSource auto-reconnects on transient network failures. We just
      // surface the disconnected state in the UI so users see when the
      // realtime channel is down (manual refresh still works).
      setLiveConnected(false)
    }
    const onLeadEvent = () => scheduleRefetch()
    const onHello = () => setLiveConnected(true)

    es.addEventListener('open', onOpen)
    es.addEventListener('error', onError)
    es.addEventListener('hello', onHello as EventListener)
    es.addEventListener('calling-agent-lead', onLeadEvent as EventListener)

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer)
      es.removeEventListener('open', onOpen)
      es.removeEventListener('error', onError)
      es.removeEventListener('hello', onHello as EventListener)
      es.removeEventListener('calling-agent-lead', onLeadEvent as EventListener)
      es.close()
    }
  }, [])

  const openDetail = (row: CallingAgentLead) => {
    setDetailRow(row)
    setDetailOpen(true)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailRow(null)
  }

  const detailTranscript = detailRow ? safeParse(detailRow.transcriptJson) : null

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
        {/* Live status pill — visual hint that realtime push is wired up */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              liveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
            }`}
            aria-hidden
          />
          <span className="text-gray-500">
            {liveConnected ? 'Live updates connected' : 'Live updates reconnecting…'}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-600 mb-1">Search phone</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setPage(1)
                  setSearch(e.target.value)
                }}
                placeholder="e.g. 9876543210"
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Type</label>
            <select
              value={eventType}
              onChange={(e) => {
                setPage(1)
                setEventType(e.target.value as any)
              }}
              className="px-3 py-2 rounded-md border border-gray-300 text-sm"
            >
              <option value="">All</option>
              <option value="lead">Lead</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setPage(1)
                setDateFrom(e.target.value)
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setPage(1)
                setDateTo(e.target.value)
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Agent ID</label>
            <Input
              value={agentId}
              onChange={(e) => {
                setPage(1)
                setAgentId(e.target.value)
              }}
              placeholder="optional"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 border-collapse">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left border border-gray-200">Type</th>
                <th className="px-3 py-2 text-left border border-gray-200">Phone</th>
                <th className="px-3 py-2 text-left border border-gray-200">Campaign</th>
                <th className="px-3 py-2 text-left border border-gray-200">Date &amp; Time</th>
                <th className="px-3 py-2 text-left border border-gray-200">Duration</th>
                <th className="px-3 py-2 text-left border border-gray-200">Owner</th>
                <th className="px-3 py-2 text-left border border-gray-200"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500 border border-gray-200">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500 border border-gray-200">
                    No records found.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          row.eventType === 'transfer'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {row.eventType}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs border border-gray-200">{row.customerPhone || '—'}</td>
                    <td className="px-3 py-2 border border-gray-200">{row.campaignName || row.campaignId || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 border border-gray-200">
                      {formatDate(row.callDateTime || row.createdAt)}
                    </td>
                    <td className="px-3 py-2 border border-gray-200">{formatDuration(row.duration)}</td>
                    <td className="px-3 py-2 text-xs border border-gray-200">
                      {row.crmUser?.email || row.crmUserId || '—'}
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDetail(row)}
                        title="View transcript / details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">
            {pagination.total} total · page {pagination.page} / {pagination.totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Detail modal */}
        {detailOpen && detailRow && (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={closeDetail}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3 border-b flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500">{detailRow.eventType.toUpperCase()}</div>
                  <div className="font-semibold">{detailRow.customerPhone || 'Unknown caller'}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={closeDetail}>
                  Close
                </Button>
              </div>
              <div className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Call ID" value={detailRow.externalCallId} mono />
                  <Field label="Event Key" value={detailRow.externalEventKey} mono />
                  <Field label="Agent" value={detailRow.agentName || detailRow.agentId} />
                  <Field
                    label="Campaign"
                    value={detailRow.campaignName || detailRow.campaignId}
                  />
                  <Field label="Call Time" value={formatDate(detailRow.callDateTime)} />
                  <Field label="Duration" value={formatDuration(detailRow.duration)} />
                  <Field label="Transfer Status" value={detailRow.transferStatus} />
                  <Field label="Recording" value={detailRow.recordingStatus} />
                </div>

                {detailRow.summary && (
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Summary</div>
                    <div className="text-sm whitespace-pre-wrap">{detailRow.summary}</div>
                  </div>
                )}

                {Array.isArray(detailTranscript) && detailTranscript.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Transcript</div>
                    <div className="border rounded max-h-64 overflow-y-auto divide-y">
                      {detailTranscript.map((t: any, i: number) => (
                        <div key={i} className="px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wider text-gray-500">
                            {t?.role || 'turn'}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{t?.content || ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string | number | null
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono break-all' : ''}`}>
        {value !== null && value !== undefined && value !== '' ? value : '—'}
      </div>
    </div>
  )
}
