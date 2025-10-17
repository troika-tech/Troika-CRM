'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { LeadFormDialog } from '@/components/lead-form-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Award,
  Clock
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface LeadSubmitter {
  name: string
  email: string
  leadsCount: number
}

interface DayWiseData {
  day: string
  leads: number
  submitters: number
}

interface MonthWiseData {
  month: string
  leads: number
  submitters: number
}

export default function SuperAdminAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'month'>('day')
  const [topSubmitters, setTopSubmitters] = useState<LeadSubmitter[]>([])
  const [dayWiseData, setDayWiseData] = useState<DayWiseData[]>([])
  const [monthWiseData, setMonthWiseData] = useState<MonthWiseData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddLead, setShowAddLead] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'SUPERADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.role === 'SUPERADMIN') {
      fetchAnalyticsData()
    }
  }, [session])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Fetch top submitters
      const topSubmittersResponse = await fetch('/api/analytics/top-submitters', {
        credentials: 'include'
      })
      if (topSubmittersResponse.ok) {
        const topSubmittersData = await topSubmittersResponse.json()
        setTopSubmitters(topSubmittersData)
      }

      // Fetch day-wise data
      const dayWiseResponse = await fetch('/api/analytics/day-wise', {
        credentials: 'include'
      })
      if (dayWiseResponse.ok) {
        const dayWiseData = await dayWiseResponse.json()
        setDayWiseData(dayWiseData)
      }

      // Fetch month-wise data
      const monthWiseResponse = await fetch('/api/analytics/month-wise', {
        credentials: 'include'
      })
      if (monthWiseResponse.ok) {
        const monthWiseData = await monthWiseResponse.json()
        setMonthWiseData(monthWiseData)
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLeadAdded = () => {
    setShowAddLead(false)
    fetchAnalyticsData()
    toast({
      title: 'Success',
      description: 'Lead added successfully!',
    })
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

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

        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <BarChart3 className="mr-3 h-8 w-8 text-indigo-500" />
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600">Comprehensive analytics and insights for SuperAdmin</p>
              </div>

              {/* Period Selector */}
              <div className="mb-8">
                <div className="flex space-x-2">
                  <Button
                    variant={selectedPeriod === 'day' ? 'default' : 'outline'}
                    onClick={() => setSelectedPeriod('day')}
                    className={selectedPeriod === 'day' ? 'bg-indigo-500' : ''}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Day Wise
                  </Button>
                  <Button
                    variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                    onClick={() => setSelectedPeriod('month')}
                    className={selectedPeriod === 'month' ? 'bg-indigo-500' : ''}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Month Wise
                  </Button>
                </div>
              </div>

              {/* Top Lead Submitters */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="mr-2 h-5 w-5 text-yellow-500" />
                      Top Lead Submitters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : topSubmitters.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No data available</div>
                    ) : (
                      <div className="space-y-4">
                        {topSubmitters.slice(0, 5).map((submitter, index) => (
                          <div key={submitter.email} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                index === 0 ? 'bg-yellow-500' : 
                                index === 1 ? 'bg-gray-400' : 
                                index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{submitter.name || 'Unknown'}</p>
                                <p className="text-sm text-gray-500">{submitter.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{submitter.leadsCount}</p>
                              <p className="text-sm text-gray-500">leads</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pie Chart for Top Submitters */}
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : topSubmitters.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No data available</div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={topSubmitters.slice(0, 5).map(s => ({ ...s, name: s.name || 'Unknown' }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percentage }) => `${name}: ${percentage}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="leadsCount"
                            >
                              {topSubmitters.slice(0, 5).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Time-based Charts */}
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
                      {selectedPeriod === 'day' ? 'Daily' : 'Monthly'} Lead Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={selectedPeriod === 'day' ? dayWiseData : monthWiseData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey={selectedPeriod === 'day' ? 'day' : 'month'} 
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis 
                              axisLine={false}
                              tickLine={false}
                              domain={[0, 100]}
                              ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Bar 
                              dataKey="leads" 
                              fill="#3b82f6" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5 text-blue-500" />
                      {selectedPeriod === 'day' ? 'Daily' : 'Monthly'} Active Submitters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={selectedPeriod === 'day' ? dayWiseData : monthWiseData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey={selectedPeriod === 'day' ? 'day' : 'month'} 
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis 
                              axisLine={false}
                              tickLine={false}
                              domain={[0, 100]}
                              ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="submitters" 
                              stroke="#10b981" 
                              strokeWidth={3}
                              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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
    </div>
  )
}
