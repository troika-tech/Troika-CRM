import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withCache, createCacheKey } from '@/lib/cache'

export const GET = withCache(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get today's date range
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Optimize: Run all queries in parallel
    const [totalLeads, todayLeads, userCounts] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true
        }
      })
    ])

    // Process user counts
    const totalAdmins = userCounts.find(u => u.role === 'ADMIN')?._count.role || 0
    const totalUsers = userCounts.find(u => u.role === 'USER')?._count.role || 0

    // Calculate percentage changes (mock data for now)
    const totalLeadsChange = 23.4 // Mock percentage
    const todayLeadsChange = 14.7 // Mock percentage
    const totalAdminsChange = -12.9 // Mock percentage
    const totalUsersChange = 13.6 // Mock percentage

    return NextResponse.json({
      totalLeads: {
        count: totalLeads,
        change: totalLeadsChange
      },
      todayLeads: {
        count: todayLeads,
        change: todayLeadsChange
      },
      totalAdmins: {
        count: totalAdmins,
        change: totalAdminsChange
      },
      totalUsers: {
        count: totalUsers,
        change: totalUsersChange
      }
    })

  } catch (error) {
    console.error('KPI fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch KPI data'
    }, { status: 500 })
  }
}, 60000) // Cache for 1 minute
