'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { CallingAgentLeadsTable } from '@/components/calling-agent-leads-table'

export default function AiCallLeadsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

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

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <ModernSidebar onAddLead={() => {}} />
        <div className="flex-1 flex flex-col ml-64">
          <Header />
          <div className="flex-1 p-4 sm:p-6">
            <div className="w-full">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI Call Leads</h1>
                  <p className="text-gray-600">
                    Leads and transfers captured by the Calling Agent
                  </p>
                </div>
              </div>
              <CallingAgentLeadsTable />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
