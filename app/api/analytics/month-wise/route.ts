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

    // Get the last 12 months
    const today = new Date()
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)

    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN'
    const isSuperAdmin = session.user.role === 'SUPERADMIN'

    let whereClause: any = {
      createdAt: {
        gte: twelveMonthsAgo,
        lte: today
      }
    }

    // If userOnly is true, only show data for the current user
    if (userOnly && session.user.role === 'USER') {
      whereClause.createdById = session.user.id
    } else if (isAdmin && !isSuperAdmin && !userOnly) {
      // For regular admins, filter by assigned users
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { assignedUserIds: true }
      })
      
      if (adminUser?.assignedUserIds && adminUser.assignedUserIds.length > 0) {
        whereClause.createdById = { in: adminUser.assignedUserIds }
      } else {
        // No assigned users - show no data
        whereClause.createdById = { in: [] }
      }
    }

      // Get all leads in the date range
      const leads = await prisma.lead.findMany({
        where: whereClause,
        select: {
          createdAt: true,
          createdById: true // Need this to count unique submitters
        }
      })

      // Group leads by month
      const monthGroups: Record<string, { leads: number, submitters: Set<string> }> = {}

      // Initialize all 12 months with 0
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = date.toISOString().substring(0, 7) // YYYY-MM
        monthGroups[monthKey] = { leads: 0, submitters: new Set() }
      }

      // Count leads and unique submitters per month
      leads.forEach(lead => {
        const monthKey = lead.createdAt.toISOString().substring(0, 7)
        if (monthGroups.hasOwnProperty(monthKey)) {
          monthGroups[monthKey].leads++
          monthGroups[monthKey].submitters.add(lead.createdById)
        }
      })

      // Format the result
      const result = Object.entries(monthGroups).map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        leads: data.leads,
        submitters: data.submitters.size // Count unique submitters
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Month-wise analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
