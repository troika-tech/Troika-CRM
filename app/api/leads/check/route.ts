import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { mobileNumbers } = body

    if (!mobileNumbers || !Array.isArray(mobileNumbers)) {
      return NextResponse.json(
        { error: 'Invalid input. mobileNumbers must be an array.' },
        { status: 400 }
      )
    }

    // Check if user is admin or superadmin for viewing all leads
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN'
    const isSuperAdmin = session.user.role === 'SUPERADMIN'

    // Build where clause similar to the main leads API
    const where: any = {
      mobile: { in: mobileNumbers }
    }
    
    // Scoping logic: ensure users only match against leads they have access to
    // This mirrors the logic in GET /api/leads but simplified for just checking existing leads
    if (isSuperAdmin) {
      // SuperAdmin can match against all leads - no extra filter needed
    } else if (isAdmin) {
      // Regular admin - check assigned users
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { assignedUserIds: true }
      })
      
      if (adminUser?.assignedUserIds && adminUser.assignedUserIds.length > 0) {
        // Admin has assigned users - only show leads from those users + themselves
        // Note: The original GET logic might be strict "only assigned users", let's replicate that.
        // Actually, logic says: if admin has users, show theirs. If no users, show none? 
        // Let's stick to strict replication of GET logic found in leads/route.ts
        where.createdById = { in: adminUser.assignedUserIds }
      } else {
        // Admin has no assigned users - show no leads
        where.createdById = { in: [] }
      }
    } else {
      // Regular user - only check against their own leads
      where.createdById = session.user.id
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        mobile: true,
        id: true
      }
    })

    return NextResponse.json({
      leads
    })
  } catch (error) {
    console.error('Leads check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
