'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PhoneCall, Search, ChevronLeft, ChevronRight, Eye, Download } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { X } from 'lucide-react'

interface CallingData {
  id: string
  name: string
  number: string
  companyName: string | null
  designation: string | null
  status: string | null
  createdAt: string
  assignedBy: {
    name: string | null
    email: string
  }
}

interface Campaign {
  id: string
  assignedBy: {
    name: string | null
    email: string
  }
  recordCount: number
  createdAt: string
  recordIds: string[]
}

export default function CallingDataPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignData, setCampaignData] = useState<CallingData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCampaignData, setLoadingCampaignData] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [customStatusMode, setCustomStatusMode] = useState<string | null>(null)
  const [customStatusValues, setCustomStatusValues] = useState<Record<string, string>>({})
  const [addedToLeads, setAddedToLeads] = useState<Record<string, boolean>>({})
  const [addingToLeads, setAddingToLeads] = useState<string | null>(null)
  const { toast } = useToast()

  // Column widths state for resizing
  const [columnWidths, setColumnWidths] = useState({
    name: 120,
    number: 110,
    company: 120,
    designation: 110,
    status: 220,
    addToLead: 130,
  })
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'USER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.role === 'USER') {
      fetchCampaigns()
    }
  }, [session, page])

  // Fetch campaign data when viewing a campaign
  useEffect(() => {
    if (viewingCampaign) {
      fetchCampaignData(viewingCampaign.recordIds)
    }
  }, [viewingCampaign])

  // Check which calling data entries have been added to leads
  useEffect(() => {
    if (campaignData.length > 0 && session?.user?.id) {
      checkLeadsStatus()
    }
  }, [campaignData, session])

  const checkLeadsStatus = async () => {
    try {
      const mobileNumbers = campaignData.map(item => item.number)
      if (mobileNumbers.length === 0) return

      // Use POST to avoid URL length limitations with large numbers of records
      const response = await fetch('/api/leads/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobileNumbers }),
      })

      if (response.ok) {
        const data = await response.json()
        const leadsMap: Record<string, boolean> = {}
        campaignData.forEach(item => {
          // Check if a lead exists with this mobile number
          const hasLead = data.leads?.some((lead: any) => lead.mobile === item.number)
          leadsMap[item.id] = hasLead || false
        })
        setAddedToLeads(leadsMap)
      }
    } catch (error) {
      console.error('Error checking leads status:', error)
    }
  }

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/calling-data/campaigns?page=${page}&pageSize=10`)
      if (!response.ok) throw new Error('Failed to fetch campaigns')

      const data = await response.json()
      setCampaigns(data.campaigns)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaignData = async (recordIds: string[]) => {
    setLoadingCampaignData(true)
    try {
      // Use POST instead of GET to avoid URL length limitations
      const response = await fetch(`/api/calling-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: recordIds }),
      })
      if (!response.ok) throw new Error('Failed to fetch campaign data')

      const data = await response.json()
      setCampaignData(data.data || [])
    } catch (error) {
      console.error('Error fetching campaign data:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch campaign data',
        variant: 'destructive',
      })
    } finally {
      setLoadingCampaignData(false)
    }
  }

  const handleViewCampaign = (campaign: Campaign) => {
    setViewingCampaign(campaign)
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingStatus(id)

    // Optimistically update the local state
    setCampaignData(prevData =>
      prevData.map(item =>
        item.id === id ? { ...item, status: newStatus || null } : item
      )
    )

    try {
      const response = await fetch(`/api/calling-data/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      toast({
        title: 'Success',
        description: 'Status updated successfully',
      })

      // Close custom status mode if it was open
      if (customStatusMode === id) {
        setCustomStatusMode(null)
        setCustomStatusValues(prev => {
          const newValues = { ...prev }
          delete newValues[id]
          return newValues
        })
      }

      // Refresh the campaign data after a short delay to ensure Select is closed
      if (viewingCampaign) {
        setTimeout(() => {
          fetchCampaignData(viewingCampaign.recordIds)
        }, 500)
      }
    } catch (error) {
      // Revert optimistic update on error
      if (viewingCampaign) {
        fetchCampaignData(viewingCampaign.recordIds)
      }

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleStatusChange = (id: string, value: string) => {
    if (value === 'other') {
      // Enter custom status mode
      setCustomStatusMode(id)
      setCustomStatusValues(prev => ({ ...prev, [id]: '' }))
    } else {
      // Update with selected status
      const statusToSave = value === 'none' ? '' : value
      handleStatusUpdate(id, statusToSave)
    }
  }

  const handleCustomStatusSubmit = (id: string) => {
    const value = customStatusValues[id] || ''
    if (value.trim()) {
      handleStatusUpdate(id, value.trim())
    } else {
      toast({
        title: 'Error',
        description: 'Please enter a status',
        variant: 'destructive',
      })
    }
  }

  const handleCustomStatusCancel = (id: string) => {
    setCustomStatusMode(null)
    setCustomStatusValues(prev => {
      const newValues = { ...prev }
      delete newValues[id]
      return newValues
    })
  }

  const handleCustomStatusValueChange = (id: string, value: string) => {
    setCustomStatusValues(prev => ({ ...prev, [id]: value }))
  }

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, column: string) => {
    e.preventDefault()
    setResizingColumn(column)
    setResizeStartX(e.clientX)
    setResizeStartWidth(columnWidths[column as keyof typeof columnWidths])
  }

  useEffect(() => {
    if (!resizingColumn) return

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX
      const newWidth = Math.max(80, resizeStartWidth + diff) // Minimum width of 80px
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth,
      }))
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth])

  const handleAddToLeadSheet = async (item: CallingData, checked: boolean) => {
    if (!checked) {
      // If unchecking, we don't remove the lead, just update the UI state
      setAddedToLeads(prev => ({ ...prev, [item.id]: false }))
      return
    }

    setAddingToLeads(item.id)

    try {
      // Check if lead already exists
      const checkResponse = await fetch('/api/leads/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobileNumbers: [item.number] }),
      })

      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        const existingLead = checkData.leads?.find((lead: any) => lead.mobile === item.number)

        if (existingLead) {
          setAddedToLeads(prev => ({ ...prev, [item.id]: true }))
          toast({
            title: 'Info',
            description: 'This entry is already in your leads',
          })
          setAddingToLeads(null)
          return
        }
      }

      // Create lead from calling data
      const leadData = {
        customerName: item.name,
        mobile: item.number,
        email: '',
        companyName: item.companyName || '',
        industryName: '',
        followUpDate: '',
        shortDescription: item.designation ? `Designation: ${item.designation}` : '',
        leadType: 'WhatsApp Marketing' as const,
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add to lead sheet')
      }

      setAddedToLeads(prev => ({ ...prev, [item.id]: true }))
      toast({
        title: 'Success',
        description: 'Entry added to lead sheet successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add to lead sheet',
        variant: 'destructive',
      })
      setAddedToLeads(prev => ({ ...prev, [item.id]: false }))
    } finally {
      setAddingToLeads(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'USER') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <ModernSidebar />

        <div className="flex-1 flex flex-col ml-64">
          <Header />

          <div className="flex-1 p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <PhoneCall className="mr-3 h-8 w-8 text-indigo-500" />
                Assigned Calling Data
              </h1>
              <p className="text-gray-600">View and manage your assigned calling data</p>
            </div>

            {/* Step 1: Campaign List OR Step 2: Full Page Table */}
            {!viewingCampaign ? (
              /* Step 1: Campaign List */
              <Card>
                <CardHeader>
                  <CardTitle>Campaigns ({pagination.total})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading...</p>
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <PhoneCall className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No campaigns assigned to you yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {campaigns.map((campaign) => (
                          <div
                            key={campaign.id}
                            onClick={() => handleViewCampaign(campaign)}
                            className="p-6 rounded-lg border bg-white border-gray-200 hover:bg-gray-50 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-lg mb-2">
                                  {campaign.assignedBy.name || campaign.assignedBy.email}
                                </p>
                                <p className="text-sm text-gray-500 mb-1">
                                  <span className="font-medium">{campaign.recordCount}</span> records
                                </p>
                                <p className="text-xs text-gray-400">
                                  {new Date(campaign.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {pagination.totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            Page {page} of {pagination.totalPages}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page - 1)}
                              disabled={page === 1}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page + 1)}
                              disabled={page >= pagination.totalPages}
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Step 2: Full Page Excel-like Table */
              <Card className="h-[calc(100vh-200px)] flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewingCampaign(null)
                          setCampaignData([])
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                      <div>
                        <CardTitle className="text-xl">Campaign Details</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Assigned by {viewingCampaign.assignedBy.name || viewingCampaign.assignedBy.email} on{' '}
                          {new Date(viewingCampaign.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">{campaignData.length}</span> records
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                  {loadingCampaignData ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading records...</p>
                      </div>
                    </div>
                  ) : campaignData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-center text-gray-400">No records found</p>
                    </div>
                  ) : (
                    <div className="h-full overflow-auto border border-gray-300">
                      <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: `${columnWidths.name}px` }} />
                          <col style={{ width: `${columnWidths.number}px` }} />
                          <col style={{ width: `${columnWidths.company}px` }} />
                          <col style={{ width: `${columnWidths.designation}px` }} />
                          <col style={{ width: `${columnWidths.status}px` }} />
                          <col style={{ width: `${columnWidths.addToLead}px` }} />
                        </colgroup>
                        <thead className="sticky top-0 bg-gray-100 z-10">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-800 relative border border-gray-300 bg-gray-100">
                              <div className="truncate">Name</div>
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 z-20"
                                onMouseDown={(e) => handleResizeStart(e, 'name')}
                              />
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-800 relative border border-gray-300 bg-gray-100">
                              <div className="truncate">Number</div>
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 z-20"
                                onMouseDown={(e) => handleResizeStart(e, 'number')}
                              />
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-800 relative border border-gray-300 bg-gray-100">
                              <div className="truncate">Company</div>
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 z-20"
                                onMouseDown={(e) => handleResizeStart(e, 'company')}
                              />
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-800 relative border border-gray-300 bg-gray-100">
                              <div className="truncate">Designation</div>
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 z-20"
                                onMouseDown={(e) => handleResizeStart(e, 'designation')}
                              />
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-800 relative border border-gray-300 bg-gray-100">
                              <div className="truncate">Status</div>
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 z-20"
                                onMouseDown={(e) => handleResizeStart(e, 'status')}
                              />
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-800 relative border border-gray-300 bg-gray-100">
                              <div className="truncate">Add To Lead</div>
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 z-20"
                                onMouseDown={(e) => handleResizeStart(e, 'addToLead')}
                              />
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {campaignData.map((item, index) => (
                            <tr key={item.id} className="hover:bg-blue-50">
                              <td className="p-2 border border-gray-300 bg-white">
                                <div className="truncate font-medium" title={item.name}>{item.name}</div>
                              </td>
                              <td className="p-2 border border-gray-300 bg-white">
                                <div className="truncate" title={item.number}>{item.number}</div>
                              </td>
                              <td className="p-2 border border-gray-300 bg-white">
                                <div className="truncate text-gray-700" title={item.companyName || '-'}>{item.companyName || '-'}</div>
                              </td>
                              <td className="p-2 border border-gray-300 bg-white">
                                <div className="truncate text-gray-700" title={item.designation || '-'}>{item.designation || '-'}</div>
                              </td>
                              <td className="p-2 border border-gray-300 bg-white">
                                {customStatusMode === item.id ? (
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="text"
                                      value={customStatusValues[item.id] || ''}
                                      onChange={(e) => handleCustomStatusValueChange(item.id, e.target.value)}
                                      placeholder="Enter custom status"
                                      className="w-44 h-9 text-sm"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleCustomStatusSubmit(item.id)
                                        } else if (e.key === 'Escape') {
                                          handleCustomStatusCancel(item.id)
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleCustomStatusSubmit(item.id)}
                                      disabled={updatingStatus === item.id || !(customStatusValues[item.id] || '').trim()}
                                      className="h-9 text-xs px-3"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCustomStatusCancel(item.id)}
                                      disabled={updatingStatus === item.id}
                                      className="h-9 px-2"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <Select
                                      value={item.status ? item.status : 'none'}
                                      onValueChange={(value) => handleStatusChange(item.id, value)}
                                      disabled={updatingStatus === item.id}
                                    >
                                      <SelectTrigger className={`w-44 h-9 text-sm ${updatingStatus === item.id ? 'opacity-50' : ''}`}>
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No Status</SelectItem>
                                        <SelectItem value="Interested">Interested</SelectItem>
                                        <SelectItem value="Not Interested">Not Interested</SelectItem>
                                        <SelectItem value="Follow Up">Follow Up</SelectItem>
                                        <SelectItem value="Call Back">Call Back</SelectItem>
                                        <SelectItem value="Do Not Call">Do Not Call</SelectItem>
                                        <SelectItem value="Converted">Converted</SelectItem>
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                        {item.status &&
                                          !['none', 'Interested', 'Not Interested', 'Follow Up', 'Call Back', 'Do Not Call', 'Converted', 'Rejected', 'other'].includes(item.status) && (
                                            <SelectItem key={`custom-${item.id}`} value={item.status}>
                                              {item.status}
                                            </SelectItem>
                                          )}
                                      </SelectContent>
                                    </Select>
                                    {updatingStatus === item.id && (
                                      <span className="text-xs text-gray-500 animate-pulse">Updating...</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 border border-gray-300 bg-white">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={addedToLeads[item.id] || false}
                                    onCheckedChange={(checked) => handleAddToLeadSheet(item, checked)}
                                    disabled={addingToLeads === item.id}
                                  />
                                  {addingToLeads === item.id && (
                                    <span className="text-xs text-gray-500 animate-pulse">Adding...</span>
                                  )}
                                  {addedToLeads[item.id] && addingToLeads !== item.id && (
                                    <span className="text-xs text-green-600 font-medium">Added</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

