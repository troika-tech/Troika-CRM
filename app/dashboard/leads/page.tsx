'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { LeadTable } from '@/components/lead-table'
import { LeadFormDialog } from '@/components/lead-form-dialog'
import { ExportDialog } from '@/components/export-dialog'
import { Button } from '@/components/ui/button'
import { Plus, Download } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function UserLeadsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [showAddLead, setShowAddLead] = useState(false)
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const handleLeadAdded = () => {
    setShowAddLead(false)
    toast({
      title: 'Success',
      description: 'Lead added successfully!',
    })
  }

  const handleExport = () => {
    setShowExport(true)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <ModernSidebar onAddLead={() => setShowAddLead(true)} />
        
        <div className="flex-1 flex flex-col">
          <Header />
          
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
                  <p className="text-gray-600">View and manage your leads</p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </Button>
                  
                  <Button
                    onClick={() => setShowAddLead(true)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Lead</span>
                  </Button>
                </div>
              </div>

              {/* Leads Table */}
              <LeadTable 
                onExport={handleExport}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Lead Dialog */}
      <LeadFormDialog
        open={showAddLead}
        onOpenChange={setShowAddLead}
        onLeadAdded={handleLeadAdded}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        isAdmin={false}
      />
    </div>
  )
}
