'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { UserFormDialog } from '@/components/user-form-dialog'
import { LeadFormDialog } from '@/components/lead-form-dialog'
import { AddAdminDialog } from '@/components/add-admin-dialog'
import { EditUserDialog } from '@/components/edit-user-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  leadsCount: number
  createdAt: string
  _count: {
    leads: number
  }
}

export default function SuperAdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [showAddLead, setShowAddLead] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const usersPerPage = 10

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'SUPERADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.role === 'SUPERADMIN') {
      fetchUsers()
    }
  }, [session, currentPage, search])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users?page=${currentPage}&pageSize=${usersPerPage}&search=${search}&role=USER`)
      if (response.ok) {
        const data = await response.json()
        // Map the API response to match the expected interface
        const mappedUsers = data.users.map((user: any) => ({
          ...user,
          leadsCount: user._count?.leads || 0,
          status: user.status || 'ACTIVE', // Ensure status is included
          _count: user._count || { leads: 0 } // Ensure _count is always present
        }))
        setUsers(mappedUsers)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUserAdded = () => {
    setShowAddUser(false)
    fetchUsers()
    toast({
      title: 'Success',
      description: 'User added successfully!',
    })
  }

  const handleAdminAdded = () => {
    setShowAddAdmin(false)
    fetchUsers()
    toast({
      title: 'Success',
      description: 'Admin created successfully!',
    })
  }

  const handleUserUpdated = () => {
    setEditingUser(null)
    fetchUsers()
    toast({
      title: 'Success',
      description: 'User updated successfully!',
    })
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user status')
      }

      toast({
        title: 'Success',
        description: `User ${newStatus.toLowerCase()} successfully!`,
      })

      fetchUsers() // Refresh the users list
    } catch (error) {
      console.error('Status update error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user status',
        variant: 'destructive',
      })
    }
  }

  const getRoleBadge = (role: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full'
    switch (role) {
      case 'SUPERADMIN':
        return `${baseClasses} bg-purple-100 text-purple-800`
      case 'ADMIN':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'USER':
        return `${baseClasses} bg-green-100 text-green-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'SUPERADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <ModernSidebar 
          onAddUser={() => setShowAddUser(true)}
          onAddLead={() => setShowAddLead(true)}
          onAddAdmin={() => setShowAddAdmin(true)}
        />

        <div className="flex-1 flex flex-col ml-64">
          <Header />
          <main className="flex-1 p-6 bg-gray-50">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">All Users</h1>
              <p className="text-gray-600 mt-2">Manage all regular users (USER role only)</p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Users Management</CardTitle>
                  <div className="flex space-x-2">
                    <Button onClick={() => setShowAddUser(true)}>
                      Add User
                    </Button>
                    <Button onClick={() => setShowAddAdmin(true)} variant="outline">
                      Add Admin
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <Input
                    placeholder="Search users by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-md"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold">Name</th>
                          <th className="text-left p-2 font-semibold">Email</th>
                          <th className="text-left p-2 font-semibold">Role</th>
                          <th className="text-left p-2 font-semibold">Status</th>
                          <th className="text-left p-2 font-semibold">Leads</th>
                          <th className="text-left p-2 font-semibold">Created</th>
                          <th className="text-left p-2 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{user.name || 'N/A'}</td>
                            <td className="p-2">{user.email}</td>
                            <td className="p-2">
                              <span className={getRoleBadge(user.role)}>
                                {user.role}
                              </span>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={user.status === 'ACTIVE'}
                                  onCheckedChange={() => handleStatusToggle(user.id, user.status)}
                                />
                                <span className={`text-sm font-medium ${
                                  user.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {user.status}
                                </span>
                              </div>
                            </td>
                            <td className="p-2">{user.leadsCount}</td>
                            <td className="p-2 text-sm text-gray-600">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {users.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No users found
                      </div>
                    )}

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* Dialogs */}
      <UserFormDialog
        open={showAddUser}
        onOpenChange={setShowAddUser}
        onUserAdded={handleUserAdded}
      />
      <AddAdminDialog
        open={showAddAdmin}
        onOpenChange={setShowAddAdmin}
        onAdminAdded={handleAdminAdded}
      />
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={() => setEditingUser(null)}
          user={editingUser}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {/* Add Lead Dialog */}
      <LeadFormDialog
        open={showAddLead}
        onOpenChange={setShowAddLead}
        onLeadAdded={() => {
          setShowAddLead(false)
          toast({
            title: 'Success',
            description: 'Lead added successfully!',
          })
        }}
      />
    </div>
  )
}
