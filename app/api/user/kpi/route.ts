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

    // Only allow USER role to access this endpoint
    if (session.user.role !== 'USER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get today's date range
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get this week's date range (Monday to Sunday)
    const startOfWeek = new Date(today)
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust when day is Sunday
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    // Get total leads count for this user
    const totalLeads = await prisma.lead.count({
      where: {
        createdById: session.user.id
      }
    })

    // Get today's leads count for this user
    const todayLeads = await prisma.lead.count({
      where: {
        createdById: session.user.id,
        createdAt: {
          gte: startOfToday,
          lt: endOfToday
        }
      }
    })

    // Get this week's leads count for this user
    const thisWeekLeads = await prisma.lead.count({
      where: {
        createdById: session.user.id,
        createdAt: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      }
    })

    // Calculate percentage changes (mock data for now)
    const totalLeadsChange = 23.4 // Mock percentage
    const todayLeadsChange = 14.7 // Mock percentage
    const thisWeekLeadsChange = 13.6 // Mock percentage

    return NextResponse.json({
      totalLeads: {
        count: totalLeads,
        change: totalLeadsChange
      },
      todayLeads: {
        count: todayLeads,
        change: todayLeadsChange
      },
      thisWeekLeads: {
        count: thisWeekLeads,
        change: thisWeekLeadsChange
      }
    })

  } catch (error) {
    console.error('User KPI fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch User KPI data'
    }, { status: 500 })
  }
}
