'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, ShoppingCart, UserPlus, Users } from 'lucide-react'

interface AdminKPICardProps {
  title: string
  value: number
  change: number
  icon: React.ReactNode
  color: string
}

export function AdminKPICard({ title, value, change, icon, color }: AdminKPICardProps) {
  const isPositive = change >= 0
  
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {value.toLocaleString()}+
            </p>
            <div className="flex items-center mt-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
        </div>
        {/* Background decoration */}
        <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-10 ${color}`}></div>
      </CardContent>
    </Card>
  )
}

interface AdminKPIGridProps {
  data: {
    totalLeads: { count: number; change: number }
    todayLeads: { count: number; change: number }
    totalUsers: { count: number; change: number }
  }
}

export function AdminKPIGrid({ data }: AdminKPIGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <AdminKPICard
        title="Total Leads"
        value={data.totalLeads.count}
        change={data.totalLeads.change}
        icon={<ShoppingCart className="h-6 w-6 text-white" />}
        color="bg-purple-500"
      />
      <AdminKPICard
        title="Today Leads"
        value={data.todayLeads.count}
        change={data.todayLeads.change}
        icon={<UserPlus className="h-6 w-6 text-white" />}
        color="bg-blue-500"
      />
      <AdminKPICard
        title="Total User"
        value={data.totalUsers.count}
        change={data.totalUsers.change}
        icon={<Users className="h-6 w-6 text-white" />}
        color="bg-orange-500"
      />
    </div>
  )
}
