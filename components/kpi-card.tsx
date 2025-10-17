'use client'

import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  iconColor: string
  bgColor: string
}

export function KPICard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  iconColor,
  bgColor 
}: KPICardProps) {
  const changeColor = changeType === 'positive' 
    ? 'text-green-600' 
    : changeType === 'negative' 
    ? 'text-red-600' 
    : 'text-gray-600'

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-20 h-20 ${bgColor} opacity-10 rounded-full -translate-y-4 translate-x-4`} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className={`text-sm font-medium ${changeColor}`}>
              {change}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
