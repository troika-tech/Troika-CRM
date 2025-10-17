'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  ChevronUp,
  ChevronDown,
  Download,
  Edit
} from 'lucide-react'
import { EditLeadDialog } from '@/components/edit-lead-dialog'

interface Lead {
  id: string
  customerName: string
  mobile: string
  email: string
  companyName?: string | null
  industryName?: string | null
  shortDescription?: string | null
  followUpDate?: string | null
  createdAt: string
  createdBy?: {
    name: string | null
    email: string
  }
}

interface LeadTableProps {
  isAdmin?: boolean
  onExport?: () => void
}

export function LeadTable({ isAdmin = false, onExport }: LeadTableProps) {
  const { data: session } = useSession()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('createdAt:desc')
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  const pageSize = 10

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search,
        sort,
      })

      if (isAdmin) {
        params.append('all', 'true')
      }

      const response = await fetch(`/api/leads?${params}`)
      if (!response.ok) throw new Error('Failed to fetch leads')

      const data = await response.json()
      setLeads(data.leads)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [page, search, sort, isAdmin])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchLeads()
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  const handleSort = (field: string) => {
    const [currentField, currentOrder] = sort.split(':')
    const newOrder = currentField === field && currentOrder === 'desc' ? 'asc' : 'desc'
    setSort(`${field}:${newOrder}`)
  }

  const getSortIcon = (field: string) => {
    const [currentField, currentOrder] = sort.split(':')
    if (currentField !== field) return null
    
    return currentOrder === 'desc' ? 
      <ChevronDown className="h-4 w-4" /> : 
      <ChevronUp className="h-4 w-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleEditClick = (lead: Lead) => {
    setEditingLead(lead)
    setShowEditDialog(true)
  }

  const handleLeadUpdated = () => {
    setShowEditDialog(false)
    setEditingLead(null)
    fetchLeads() // Refresh the leads list
  }

  const canEditLead = (lead: Lead) => {
    if (!session?.user?.id) return false
    
    const userRole = session.user.role
    const isOwner = lead.createdBy?.email === session.user.email
    
    // SuperAdmin can edit all leads
    if (userRole === 'SUPERADMIN') return true
    
    // Users and Admins can only edit their own leads
    if (userRole === 'USER' || userRole === 'ADMIN') {
      return isOwner
    }
    
    return false
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading leads...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isAdmin ? 'All Leads' : 'Your Leads'} ({pagination.total})
        </CardTitle>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {onExport && (
            <Button onClick={onExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {search ? 'No leads found matching your search.' : 'No leads found.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('customerName')}
                        className="h-auto p-0 font-semibold"
                      >
                        Customer Name {getSortIcon('customerName')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('mobile')}
                        className="h-auto p-0 font-semibold"
                      >
                        Mobile {getSortIcon('mobile')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('email')}
                        className="h-auto p-0 font-semibold"
                      >
                        Email {getSortIcon('email')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('companyName')}
                        className="h-auto p-0 font-semibold"
                      >
                        Company {getSortIcon('companyName')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('industryName')}
                        className="h-auto p-0 font-semibold"
                      >
                        Industry {getSortIcon('industryName')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('shortDescription')}
                        className="h-auto p-0 font-semibold"
                      >
                        Short Description {getSortIcon('shortDescription')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('followUpDate')}
                        className="h-auto p-0 font-semibold"
                      >
                        Follow-up Date {getSortIcon('followUpDate')}
                      </Button>
                    </th>
                    {isAdmin && (
                      <th className="text-left p-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('createdBy')}
                          className="h-auto p-0 font-semibold"
                        >
                          Owner {getSortIcon('createdBy')}
                        </Button>
                      </th>
                    )}
                    <th className="text-left p-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('createdAt')}
                        className="h-auto p-0 font-semibold"
                      >
                        Created At {getSortIcon('createdAt')}
                      </Button>
                    </th>
                    <th className="text-left p-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{lead.customerName}</td>
                      <td className="p-2">{lead.mobile}</td>
                      <td className="p-2">{lead.email}</td>
                      <td className="p-2">{lead.companyName || '-'}</td>
                      <td className="p-2">{lead.industryName || '-'}</td>
                      <td className="p-2 max-w-xs">
                        <div className="truncate" title={lead.shortDescription || ''}>
                          {lead.shortDescription || '-'}
                        </div>
                      </td>
                      <td className="p-2 text-sm text-gray-600">
                        {lead.followUpDate ? formatDate(lead.followUpDate) : '-'}
                      </td>
                      {isAdmin && (
                        <td className="p-2 text-sm text-gray-600">
                          {lead.createdBy?.name || lead.createdBy?.email}
                        </td>
                      )}
                      <td className="p-2 text-sm text-gray-600">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="p-2">
                        {canEditLead(lead) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(lead)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Lead</span>
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.hasNext}
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
      
      {/* Edit Lead Dialog */}
      {editingLead && (
        <EditLeadDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          lead={editingLead}
          onLeadUpdated={handleLeadUpdated}
        />
      )}
    </Card>
  )
}
