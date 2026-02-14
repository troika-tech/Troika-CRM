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
      
      const response = await fetch(`/api/leads?search=${encodeURIComponent(mobileNumbers.join(','))}&checkMobiles=true&userOnly=true`)
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

  const handleAddToLeadSheet = async (item: CallingData, checked: boolean) => {
    if (!checked) {
      // If unchecking, we don't remove the lead, just update the UI state
      setAddedToLeads(prev => ({ ...prev, [item.id]: false }))
      return
    }

    setAddingToLeads(item.id)
    
    try {
      // Check if lead already exists
      const checkResponse = await fetch(`/api/leads?search=${encodeURIComponent(item.number)}&checkMobiles=true&userOnly=true`)
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

            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
              {/* Left Side - Campaigns List */}
              <div className="col-span-4">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>Campaigns ({pagination.total})</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto">
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
                        <div className="space-y-2">
                          {campaigns.map((campaign) => (
                            <div
                              key={campaign.id}
                              onClick={() => handleViewCampaign(campaign)}
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                viewingCampaign?.id === campaign.id
                                  ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">
                                    {campaign.assignedBy.name || campaign.assignedBy.email}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {campaign.recordCount} records
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(campaign.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                          <div className="mt-4 pt-4 border-t space-y-2">
                            <p className="text-xs text-gray-600 text-center">
                              Page {page} of {pagination.totalPages}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="flex-1"
                              >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(page + 1)}
                                disabled={page >= pagination.totalPages}
                                className="flex-1"
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
              </div>

              {/* Right Side - Campaign Details */}
              <div className="col-span-8">
                {!viewingCampaign ? (
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-400 p-8">
                      <Eye className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">Select a campaign to view details</p>
                    </div>
                  </Card>
                ) : (
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Campaign Details</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            Records assigned on {new Date(viewingCampaign.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewingCampaign(null)
                            setCampaignData([])
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                      {viewingCampaign && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                            <div>
                              <span className="font-semibold">Assigned By:</span>{' '}
                              {viewingCampaign.assignedBy.name || viewingCampaign.assignedBy.email}
                            </div>
                            <div>
                              <span className="font-semibold">Total Records:</span> {viewingCampaign.recordCount}
                            </div>
                            <div className="col-span-2">
                              <span className="font-semibold">Date:</span>{' '}
                              {new Date(viewingCampaign.createdAt).toLocaleString()}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h3 className="font-semibold mb-4">Records</h3>
                            {loadingCampaignData ? (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading records...</p>
                              </div>
                            ) : campaignData.length === 0 ? (
                              <p className="text-center text-gray-400 py-4">No records found</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-gray-50">
                                      <th className="text-left p-2 font-semibold text-gray-700">Name</th>
                                      <th className="text-left p-2 font-semibold text-gray-700">Number</th>
                                      <th className="text-left p-2 font-semibold text-gray-700">Company</th>
                                      <th className="text-left p-2 font-semibold text-gray-700">Designation</th>
                                      <th className="text-left p-2 font-semibold text-gray-700">Status</th>
                                      <th className="text-left p-2 font-semibold text-gray-700">Add To Lead</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {campaignData.map((item) => (
                                      <tr key={item.id} className="border-b hover:bg-gray-50">
                                        <td className="p-2">{item.name}</td>
                                        <td className="p-2">{item.number}</td>
                                        <td className="p-2">{item.companyName || '-'}</td>
                                        <td className="p-2">{item.designation || '-'}</td>
                                        <td className="p-2">
                                          {customStatusMode === item.id ? (
                                            <div className="flex items-center space-x-2">
                                              <Input
                                                type="text"
                                                value={customStatusValues[item.id] || ''}
                                                onChange={(e) => handleCustomStatusValueChange(item.id, e.target.value)}
                                                placeholder="Enter custom status"
                                                className="w-40 h-8 text-sm"
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
                                                className="h-8 text-xs"
                                              >
                                                Save
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCustomStatusCancel(item.id)}
                                                disabled={updatingStatus === item.id}
                                                className="h-8 px-2"
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
                                                <SelectTrigger className={`w-40 h-8 text-sm ${updatingStatus === item.id ? 'opacity-50' : ''}`}>
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
                                        <td className="p-2">
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
                                              <span className="text-xs text-green-600">Added</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

