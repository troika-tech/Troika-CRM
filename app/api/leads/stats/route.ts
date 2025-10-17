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

    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN'
    const userId = isAdmin ? undefined : session.user.id

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

    const whereClause = userId ? { createdById: userId } : {}

    const [total, today, thisWeek, totalUsers, totalAdmins] = await Promise.all([
      prisma.lead.count({ where: whereClause }),
      prisma.lead.count({
        where: {
          ...whereClause,
          createdAt: { gte: startOfDay }
        }
      }),
      prisma.lead.count({
        where: {
          ...whereClause,
          createdAt: { gte: startOfWeek }
        }
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } })
    ])

    return NextResponse.json({
      total: total,
      today: today,
      thisWeek: thisWeek,
      totalUsers,
      totalAdmins
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
