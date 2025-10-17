'use client'

import { useState } from 'react'
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
import { Settings } from 'lucide-react'

const data = [
  { month: 'Jan', income: 65, expenses: 28 },
  { month: 'Feb', income: 59, expenses: 48 },
  { month: 'Mar', income: 80, expenses: 40 },
  { month: 'Apr', income: 81, expenses: 19 },
  { month: 'May', income: 56, expenses: 96 },
  { month: 'Jun', income: 55, expenses: 27 },
  { month: 'Jul', income: 40, expenses: 20 },
  { month: 'Aug', income: 50, expenses: 30 },
  { month: 'Sep', income: 70, expenses: 45 },
  { month: 'Oct', income: 85, expenses: 35 },
  { month: 'Nov', income: 75, expenses: 25 },
  { month: 'Dec', income: 90, expenses: 40 },
]

export function SalesChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('Daily')

  const periods = ['Daily', 'Weekly', 'Monthly']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Sales Update</CardTitle>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Legend */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Income</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-200 rounded-full"></div>
            <span className="text-sm text-gray-600">Expenses</span>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex space-x-2 mt-4">
          {periods.map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className={selectedPeriod === period ? "bg-indigo-500" : ""}
            >
              {period}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name) => [`${value}`, name === 'income' ? 'Income' : 'Expenses']}
              />
              <Area
                type="monotone"
                dataKey="income"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stackId="2"
                stroke="#93c5fd"
                fill="#93c5fd"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
