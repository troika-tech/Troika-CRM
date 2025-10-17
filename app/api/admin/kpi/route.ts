import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get today's date range
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get total leads count
    const totalLeads = await prisma.lead.count()

    // Get today's leads count
    const todayLeads = await prisma.lead.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lt: endOfToday
        }
      }
    })

    // Get total user count (only USER role, not ADMIN)
    const totalUsers = await prisma.user.count({
      where: {
        role: 'USER'
      }
    })

    // Calculate percentage changes (mock data for now)
    const totalLeadsChange = 23.4 // Mock percentage
    const todayLeadsChange = 14.7 // Mock percentage
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
      totalUsers: {
        count: totalUsers,
        change: totalUsersChange
      }
    })

  } catch (error) {
    console.error('Admin KPI fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch Admin KPI data'
    }, { status: 500 })
  }
}
