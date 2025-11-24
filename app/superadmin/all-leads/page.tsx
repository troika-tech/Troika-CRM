'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { LeadTable } from '@/components/lead-table'
import { UserFormDialog } from '@/components/user-form-dialog'
import { AddAdminDialog } from '@/components/add-admin-dialog'
import { ExportDialog } from '@/components/export-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function SuperAdminAllLeadsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [showAddUser, setShowAddUser] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'SUPERADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])



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
          onAddLead={() => {}}
          onAddUser={() => {}}
          onAddAdmin={() => {}}
        />

        <div className="flex-1 flex flex-col ml-64">
          <Header />
          
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <FileText className="mr-3 h-8 w-8 text-indigo-500" />
                    All Leads
                  </h1>
                  <p className="text-gray-600">View and manage all leads in the system</p>
                </div>
                <Link href="/superadmin/all-leads/add">
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Lead</span>
                  </Button>
                </Link>
              </div>

              {/* All Leads Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">All Leads</CardTitle>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowExport(true)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <LeadTable 
                    isAdmin={true} 
                    onExport={() => setShowExport(true)}
                  />
                </CardContent>
              </Card>

              {/* Export Dialog */}
              <ExportDialog
                open={showExport}
                onOpenChange={setShowExport}
                isAdmin={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <UserFormDialog
        open={showAddUser}
        onOpenChange={setShowAddUser}
        onUserAdded={() => {
          setShowAddUser(false)
          toast({
            title: 'Success',
            description: 'User added successfully!',
          })
        }}
      />

      {/* Add Admin Dialog */}
      <AddAdminDialog
        open={showAddAdmin}
        onOpenChange={setShowAddAdmin}
        onAdminAdded={() => {
          setShowAddAdmin(false)
          toast({
            title: 'Success',
            description: 'Admin added successfully!',
          })
        }}
      />
    </div>
  )
}
