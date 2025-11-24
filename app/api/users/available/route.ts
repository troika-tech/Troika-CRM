import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or SuperAdmin access required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const excludeAdminId = searchParams.get('excludeAdminId') || ''

    const where: any = {
      role: 'USER'
      // Show all users regardless of status so admins can assign any user
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } }
      ]
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Available users fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

