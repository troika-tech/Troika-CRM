'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { UserFormDialog } from '@/components/user-form-dialog'
import { LeadFormDialog } from '@/components/lead-form-dialog'
import { AdminKPIGrid } from '@/components/admin-kpi-grid'
import { SalesChart } from '@/components/sales-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, Calendar, ShoppingCart, Headphones, Gauge, UserPlus } from 'lucide-react'

interface AdminKPIData {
  totalLeads: { count: number; change: number }
  todayLeads: { count: number; change: number }
  totalUsers: { count: number; change: number }
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kpiData, setKpiData] = useState<AdminKPIData>({ 
    totalLeads: { count: 0, change: 0 },
    todayLeads: { count: 0, change: 0 },
    totalUsers: { count: 0, change: 0 }
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
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
      fetchKpiData()
    }
  }, [session])

  const fetchKpiData = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch('/api/admin/kpi')
      if (response.ok) {
        const data = await response.json()
        setKpiData(data)
      }
    } catch (error) {
      console.error('Error fetching Admin KPI data:', error)
    } finally {
      setStatsLoading(false)
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

  const handleLeadAdded = () => {
    setShowAddLead(false)
    // Refresh stats after adding a lead
    fetchKpiData()
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
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Overview of all leads and system statistics</p>
              </div>

              {/* KPI Cards */}
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-20 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <AdminKPIGrid data={kpiData} />
              )}

              {/* Chart Section */}
              <div className="mb-8">
                <SalesChart />
              </div>

              {/* Add User Dialog */}
              <UserFormDialog
                open={showAddUser}
                onOpenChange={setShowAddUser}
                onUserAdded={() => {
                  // Refresh stats or any other data if needed
                  fetchKpiData()
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
