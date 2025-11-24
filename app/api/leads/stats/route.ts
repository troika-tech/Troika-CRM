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
    const isSuperAdmin = session.user.role === 'SUPERADMIN'
    
    // Build where clause for leads
    let whereClause: any = {}
    
    if (!isAdmin) {
      // Regular users see only their own leads
      whereClause.createdById = session.user.id
    } else if (isAdmin && !isSuperAdmin) {
      // Regular admins see only leads from assigned users
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { assignedUserIds: true }
      })
      
      if (adminUser?.assignedUserIds && adminUser.assignedUserIds.length > 0) {
        whereClause.createdById = { in: adminUser.assignedUserIds }
      } else {
        // No assigned users - show no leads
        whereClause.createdById = { in: [] }
      }
    }
    // For SUPERADMIN, whereClause remains empty (show all leads)

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

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
