'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [showViewDialog, setShowViewDialog] = useState(false)
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
    if (viewingCampaign && showViewDialog) {
      fetchCampaignData(viewingCampaign.recordIds)
    }
  }, [viewingCampaign, showViewDialog])

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
      const response = await fetch(`/api/calling-data?ids=${recordIds.join(',')}`)
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
    setShowViewDialog(true)
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
        leadStatus: 'Lead' as const,
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
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <PhoneCall className="mr-3 h-8 w-8 text-indigo-500" />
                  Assigned Calling Data
                </h1>
                <p className="text-gray-600">View and manage your assigned calling data</p>
              </div>

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
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3 font-semibold text-gray-700">Assigned By</th>
                              <th className="text-left p-3 font-semibold text-gray-700">Records</th>
                              <th className="text-left p-3 font-semibold text-gray-700">Assigned Date</th>
                              <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campaigns.map((campaign) => (
                              <tr key={campaign.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                  {campaign.assignedBy.name || campaign.assignedBy.email}
                                </td>
                                <td className="p-3">{campaign.recordCount}</td>
                                <td className="p-3 text-sm text-gray-500">
                                  {new Date(campaign.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewCampaign(campaign)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-600">
                            Showing {(page - 1) * pagination.pageSize + 1} to{' '}
                            {Math.min(page * pagination.pageSize, pagination.total)} of{' '}
                            {pagination.total} results
                          </p>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page - 1)}
                              disabled={page === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <span className="text-sm text-gray-600">
                              Page {page} of {pagination.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page + 1)}
                              disabled={page >= pagination.totalPages}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* View Campaign Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Campaign Details</DialogTitle>
                <DialogDescription>
                  Records assigned on {viewingCampaign && new Date(viewingCampaign.createdAt).toLocaleDateString()}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {viewingCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Assigned By:</span>{' '}
                  {viewingCampaign.assignedBy.name || viewingCampaign.assignedBy.email}
                </div>
                <div>
                  <span className="font-semibold">Total Records:</span> {viewingCampaign.recordCount}
                </div>
                <div>
                  <span className="font-semibold">Date:</span>{' '}
                  {new Date(viewingCampaign.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Records Status</h3>
                {loadingCampaignData ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading records...</p>
                  </div>
                ) : campaignData.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No records found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold text-gray-700 text-sm">Name</th>
                          <th className="text-left p-2 font-semibold text-gray-700 text-sm">Number</th>
                          <th className="text-left p-2 font-semibold text-gray-700 text-sm">Company</th>
                          <th className="text-left p-2 font-semibold text-gray-700 text-sm">Designation</th>
                          <th className="text-left p-2 font-semibold text-gray-700 text-sm">Status</th>
                          <th className="text-left p-2 font-semibold text-gray-700 text-sm">Add To Lead Sheet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignData.map((item) => (
                              <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{item.name}</td>
                                <td className="p-3">{item.number}</td>
                                <td className="p-3">{item.companyName || '-'}</td>
                                <td className="p-3">{item.designation || '-'}</td>
                                <td className="p-3">
                                  {customStatusMode === item.id ? (
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        type="text"
                                        value={customStatusValues[item.id] || ''}
                                        onChange={(e) => handleCustomStatusValueChange(item.id, e.target.value)}
                                        placeholder="Enter custom status"
                                        className="w-48 h-9"
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
                                        className="h-9"
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
                                        <X className="h-4 w-4" />
                                      </Button>
                                      {updatingStatus === item.id && (
                                        <span className="text-xs text-gray-500 animate-pulse">Updating...</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <Select
                                        value={item.status ? item.status : 'none'}
                                        onValueChange={(value) => handleStatusChange(item.id, value)}
                                        disabled={updatingStatus === item.id}
                                      >
                                        <SelectTrigger className={`w-48 h-9 ${updatingStatus === item.id ? 'opacity-50' : ''}`}>
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
                                          {/* Dynamically add custom status if it exists and is not in predefined list */}
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
                                <td className="p-3">
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
        </DialogContent>
      </Dialog>
    </div>
  )
}

