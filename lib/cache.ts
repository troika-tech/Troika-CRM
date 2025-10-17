import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

export function getCachedResponse(key: string) {
  const cached = cache.get(key)
  if (!cached) return null
  
  const now = Date.now()
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}

export function setCachedResponse(key: string, data: any, ttl: number = 300000) { // 5 minutes default
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

export function createCacheKey(request: NextRequest, additionalParams?: Record<string, any>) {
  const url = new URL(request.url)
  const searchParams = new URLSearchParams(url.search)
  
  // Add additional parameters to cache key
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      searchParams.set(key, String(value))
    })
  }
  
  return `${url.pathname}?${searchParams.toString()}`
}

// Middleware for API caching
export function withCache(handler: Function, ttl: number = 300000) {
  return async (request: NextRequest, context?: any) => {
    const cacheKey = createCacheKey(request)
    const cached = getCachedResponse(cacheKey)
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'X-Cache': 'HIT'
        }
      })
    }
    
    const response = await handler(request, context)
    
    if (response.ok) {
      // Clone the response to avoid consuming the body
      const responseClone = response.clone()
      try {
        const data = await responseClone.json()
        setCachedResponse(cacheKey, data, ttl)
        
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'public, max-age=300',
            'X-Cache': 'MISS'
          }
        })
      } catch (error) {
        // If we can't parse JSON, return the original response
        return response
      }
    }
    
    return response
  }
}

// Clear cache for specific patterns
export function clearCache(pattern?: string) {
  if (!pattern) {
    cache.clear()
    return
  }

  const keys = Array.from(cache.keys())
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}
