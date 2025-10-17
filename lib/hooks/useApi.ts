'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseApiOptions {
  cacheTime?: number
  staleTime?: number
  retry?: number
}

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

export function useApi<T>(
  url: string,
  options: UseApiOptions = {}
): ApiState<T> {
  const {
    cacheTime = 300000, // 5 minutes
    staleTime = 60000,   // 1 minute
    retry = 3
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const cacheKey = url
    const cached = cache.get(cacheKey)
    const now = Date.now()

    // Check if we have valid cached data
    if (cached && (now - cached.timestamp) < cached.ttl) {
      setData(cached.data)
      setLoading(false)
      setError(null)
      
      // If data is stale, refetch in background
      if ((now - cached.timestamp) > staleTime) {
        fetchFreshData()
      }
      return
    }

    await fetchFreshData()
  }, [url, cacheTime, staleTime])

  const fetchFreshData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Cache the result
      cache.set(url, {
        data: result,
        timestamp: Date.now(),
        ttl: cacheTime
      })

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const refetch = useCallback(() => {
    cache.delete(url)
    fetchData()
  }, [url, fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}

// Hook for KPI data specifically
export function useKPIData() {
  return useApi('/api/dashboard/kpi', {
    cacheTime: 60000, // 1 minute cache
    staleTime: 30000  // 30 seconds stale
  })
}

// Hook for leads data
export function useLeadsData() {
  return useApi('/api/leads', {
    cacheTime: 300000, // 5 minutes cache
    staleTime: 120000  // 2 minutes stale
  })
}

// Hook for analytics data
export function useAnalyticsData() {
  return useApi('/api/analytics/day-wise', {
    cacheTime: 600000, // 10 minutes cache
    staleTime: 300000  // 5 minutes stale
  })
}
