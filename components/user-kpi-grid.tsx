'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CardSkeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, ShoppingCart, Calendar, TrendingUp as TrendingUpIcon } from 'lucide-react'
import { memo } from 'react'

interface UserKPICardProps {
  title: string
  value: number
  change: number
  icon: React.ReactNode
  color: string
}

export const UserKPICard = memo(function UserKPICard({ title, value, change, icon, color }: UserKPICardProps) {
  const isPositive = change >= 0
  
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md">
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
})

interface UserKPIGridProps {
  data?: {
    totalLeads: { count: number; change: number }
    todayLeads: { count: number; change: number }
    thisWeekLeads: { count: number; change: number }
  }
  isLoading?: boolean
}

export const UserKPIGrid = memo(function UserKPIGrid({ data, isLoading }: UserKPIGridProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <UserKPICard
        title="Total Leads"
        value={data.totalLeads.count}
        change={data.totalLeads.change}
        icon={<ShoppingCart className="h-6 w-6 text-white" />}
        color="bg-purple-500"
      />
      <UserKPICard
        title="Today Leads"
        value={data.todayLeads.count}
        change={data.todayLeads.change}
        icon={<Calendar className="h-6 w-6 text-white" />}
        color="bg-blue-500"
      />
      <UserKPICard
        title="This Week Leads"
        value={data.thisWeekLeads.count}
        change={data.thisWeekLeads.change}
        icon={<TrendingUpIcon className="h-6 w-6 text-white" />}
        color="bg-orange-500"
      />
    </div>
  )
})
