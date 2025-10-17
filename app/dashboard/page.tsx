'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { LeadFormDialog } from '@/components/lead-form-dialog'
import { LeadTable } from '@/components/lead-table'
import { ExportDialog } from '@/components/export-dialog'
import { UserKPIGrid } from '@/components/user-kpi-grid'
import { SalesChart } from '@/components/sales-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/lib/hooks/useApi'
import { Users, TrendingUp, Calendar, ShoppingCart, UserPlus, Gauge, Plus } from 'lucide-react'

interface UserKPIData {
  totalLeads: { count: number; change: number }
  todayLeads: { count: number; change: number }
  thisWeekLeads: { count: number; change: number }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showAddLead, setShowAddLead] = useState(false)
  const [showExport, setShowExport] = useState(false)
  
  // Use optimized API hook with caching for user-specific data
  const { data: kpiDataRaw, loading: statsLoading, refetch: refetchKPI } = useApi('/api/user/kpi', {
    cacheTime: 60000, // 1 minute cache
    staleTime: 30000  // 30 seconds stale
  })

  const kpiData = kpiDataRaw as UserKPIData | undefined

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const handleLeadAdded = () => {
    refetchKPI() // Refetch KPI data when a new lead is added
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

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <ModernSidebar onAddLead={() => setShowAddLead(true)} />
        
        <div className="flex-1 flex flex-col ml-64">
          <Header />
          
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Manage your leads and track your progress</p>
              </div>

              {/* KPI Cards */}
              <UserKPIGrid data={kpiData} isLoading={statsLoading} />

              {/* Chart Section */}
              <div className="mb-8">
                <SalesChart />
              </div>

              {/* Leads Table */}
              <LeadTable 
                onExport={() => setShowExport(true)}
              />

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
          </div>
        </div>
      </div>
    </div>
  )
}
