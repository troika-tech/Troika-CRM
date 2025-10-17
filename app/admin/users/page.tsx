'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { UserFormDialog } from '@/components/user-form-dialog'
import { EditUserDialog } from '@/components/edit-user-dialog'
import { LeadFormDialog } from '@/components/lead-form-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Mail,
  Calendar,
  Users as UsersIcon,
  Edit,
  Key
} from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  _count: {
    leads: number
  }
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export default function AllUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showAddLead, setShowAddLead] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers()
    }
  }, [session, page, search])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        search,
        excludeRole: 'SUPERADMIN' // Exclude SuperAdmin users
      })

      const response = await fetch(`/api/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchUsers()
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRoleBadgeColor = (role: string) => {
    return role === 'ADMIN' 
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditUser(true)
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

  const handleLeadAdded = () => {
    setShowAddLead(false)
    // Refresh users data after adding a lead
    fetchUsers()
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <ModernSidebar 
          onAddUser={() => setShowAddUser(true)}
          onAddLead={() => setShowAddLead(true)}
        />
        
        <div className="flex-1 flex flex-col">
          <Header />
          
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <UsersIcon className="mr-3 h-8 w-8 text-indigo-500" />
                  All Users
                </h1>
                <p className="text-gray-600">Manage all registered users in the system</p>
              </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Users ({pagination.total})
                  </CardTitle>
                  <Button onClick={() => setShowAddUser(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {search ? 'No users found matching your search.' : 'No users found.'}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-semibold">Name</th>
                            <th className="text-left p-2 font-semibold">Email</th>
                            <th className="text-left p-2 font-semibold">Password</th>
                            <th className="text-left p-2 font-semibold">Role</th>
                            <th className="text-left p-2 font-semibold">Leads Count</th>
                            <th className="text-left p-2 font-semibold">Created At</th>
                            <th className="text-left p-2 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                    <UsersIcon className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <span className="font-medium">
                                    {user.name || 'No Name'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="h-4 w-4 mr-2" />
                                  {user.email}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Key className="h-4 w-4 mr-2" />
                                  ••••••••
                                </div>
                              </td>
                              <td className="p-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="p-2">
                                <span className="text-sm font-medium">
                                  {user._count.leads}
                                </span>
                              </td>
                              <td className="p-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {formatDate(user.createdAt)}
                                </div>
                              </td>
                              <td className="p-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-600">
                          Showing {((page - 1) * pagination.pageSize) + 1} to {Math.min(page * pagination.pageSize, pagination.total)} of {pagination.total} results
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
            </Card>

              {/* Add User Dialog */}
              <UserFormDialog
                open={showAddUser}
                onOpenChange={setShowAddUser}
                onUserAdded={() => {
                  fetchUsers()
                }}
              />

              {/* Edit User Dialog */}
              <EditUserDialog
                open={showEditUser}
                onOpenChange={setShowEditUser}
                user={selectedUser}
                onUserUpdated={() => {
                  fetchUsers()
                  setSelectedUser(null)
                }}
              />

              {/* Add Lead Dialog */}
              <LeadFormDialog
                open={showAddLead}
                onOpenChange={setShowAddLead}
                onLeadAdded={handleLeadAdded}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
