import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userOnly = searchParams.get('userOnly') === 'true'

    // Get the last 7 days
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    let whereClause: any = {
      createdAt: {
        gte: sevenDaysAgo,
        lte: today
      }
    }

    // If userOnly is true, only show data for the current user
    if (userOnly && session.user.role === 'USER') {
      whereClause.createdById = session.user.id
    }

      // Get all leads in the date range
      const leads = await prisma.lead.findMany({
        where: whereClause,
        select: {
          createdAt: true,
          createdById: true // Need this to count unique submitters
        }
      })

      // Group leads by day
      const dayGroups: Record<string, { leads: number, submitters: Set<string> }> = {}

      // Initialize all 7 days with 0
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayKey = date.toISOString().split('T')[0]
        dayGroups[dayKey] = { leads: 0, submitters: new Set() }
      }

      // Count leads and unique submitters per day
      leads.forEach(lead => {
        const dayKey = lead.createdAt.toISOString().split('T')[0]
        if (dayGroups.hasOwnProperty(dayKey)) {
          dayGroups[dayKey].leads++
          dayGroups[dayKey].submitters.add(lead.createdById)
        }
      })

      // Format the result
      const result = Object.entries(dayGroups).map(([date, data]) => ({
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        leads: data.leads,
        submitters: data.submitters.size // Count unique submitters
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Day-wise analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
