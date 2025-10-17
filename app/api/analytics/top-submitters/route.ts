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

    let whereClause = {}
    
    // If userOnly is true, only show data for the current user
    if (userOnly && session.user.role === 'USER') {
      whereClause = {
        createdById: session.user.id
      }
    }

    // Get top lead submitters with their lead counts
    const submitters = await prisma.user.findMany({
      where: {
        leads: {
          some: whereClause // Apply userOnly filter here
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            leads: {
              where: whereClause // Count only leads matching the filter
            }
          }
        }
      },
      orderBy: {
        leads: {
          _count: 'desc'
        }
      }
    })

    // Calculate total leads for percentage calculation
    const totalLeads = submitters.reduce((sum, user) => sum + user._count.leads, 0)

    // Format the data
    const formattedSubmitters = submitters.map(user => ({
      name: user.name || 'Unknown',
      email: user.email,
      leadsCount: user._count.leads, // Changed from leadCount to leadsCount
      percentage: totalLeads > 0 ? Math.round((user._count.leads / totalLeads) * 100) : 0
    }))

    return NextResponse.json(formattedSubmitters)
  } catch (error) {
    console.error('Top submitters fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
