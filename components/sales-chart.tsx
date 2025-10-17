'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { Settings, TrendingUp } from 'lucide-react'

interface ChartData {
  day: string
  totalLeads: number
  todayLeads: number
}

export function SalesChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('Daily')
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [todayCount, setTodayCount] = useState(0)

  const periods = ['Daily', 'Weekly', 'Monthly']

  useEffect(() => {
    fetchChartData()
  }, [selectedPeriod])

  const fetchChartData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analytics/day-wise')
      if (response.ok) {
        const dayWiseData = await response.json()

        // Transform the data to show cumulative total and today's leads
        let cumulativeTotal = 0
        const transformedData = dayWiseData.map((item: any, index: number) => {
          cumulativeTotal += item.leads
          return {
            day: item.day,
            totalLeads: cumulativeTotal,
            todayLeads: item.leads
          }
        })

        setData(transformedData)

        // Set summary counts
        if (transformedData.length > 0) {
          const lastDay = transformedData[transformedData.length - 1]
          setTotalCount(lastDay.totalLeads)
          setTodayCount(lastDay.todayLeads)
        }
      }
    } catch (error) {
      console.error('Error fetching chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Leads Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Leads Overview (Last 7 Days)
            </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-sm">
                <span className="text-gray-600">Total: </span>
                <span className="font-semibold text-indigo-600">{totalCount}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Today: </span>
                <span className="font-semibold text-green-600">{todayCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Total Leads (Cumulative)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Today's Leads</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name) => [
                  `${value} leads`,
                  name === 'totalLeads' ? 'Total Leads' : "Today's Leads"
                ]}
              />
              <Area
                type="monotone"
                dataKey="totalLeads"
                stackId="1"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.6}
                name="Total Leads"
              />
              <Area
                type="monotone"
                dataKey="todayLeads"
                stackId="2"
                stroke="#4ade80"
                fill="#4ade80"
                fillOpacity={0.6}
                name="Today's Leads"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
