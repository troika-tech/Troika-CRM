import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { data, assignedToId, ids } = body

    // If 'ids' is provided, this is a fetch request (not create)
    if (ids && Array.isArray(ids)) {
      // Build where clause
      const where: any = {
        id: { in: ids }
      }

      // Regular users can only see their own assigned data
      if (session.user.role === 'USER') {
        where.assignedToId = session.user.id
      }

      // Fetch calling data by IDs
      const callingData = await prisma.callingData.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return NextResponse.json({
        data: callingData,
        pagination: {
          page: 1,
          pageSize: callingData.length,
          total: callingData.length,
          totalPages: 1,
        },
      })
    }

    // Otherwise, this is a create request - Only Admin and SuperAdmin can assign data
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Data is required and must be an array' }, { status: 400 })
    }

    if (!assignedToId) {
      return NextResponse.json({ error: 'assignedToId is required' }, { status: 400 })
    }

    // Verify the assigned user exists and is a USER role
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, role: true }
    })

    if (!assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
    }

    if (assignedUser.role !== 'USER') {
      return NextResponse.json({ error: 'Can only assign data to users with USER role' }, { status: 400 })
    }

    // Create calling data records
    const callingDataRecords = data
      .map((row: any) => ({
        name: String(row.name || '').trim(),
        number: String(row.number || '').trim(),
        companyName: row.companyName ? String(row.companyName).trim() : null,
        designation: row.designation ? String(row.designation).trim() : null,
        status: row.status ? String(row.status).trim() : null,
        assignedToId: assignedToId,
        assignedById: session.user.id,
      }))
      .filter((row: any) => row.name && row.number) // Filter out invalid rows

    if (callingDataRecords.length === 0) {
      return NextResponse.json({ error: 'No valid records to create' }, { status: 400 })
    }

    // Check if CallingData model exists in Prisma client
    if (!prisma.callingData) {
      return NextResponse.json({ 
        error: 'CallingData model not found. Please restart the server after running: npx prisma generate' 
      }, { status: 500 })
    }

    // Create records - MongoDB supports createMany
    const result = await prisma.callingData.createMany({
      data: callingDataRecords,
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully assigned ${result.count} records`,
    })
  } catch (error: any) {
    console.error('Error creating calling data:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const ids = searchParams.get('ids') || ''

    const skip = (page - 1) * pageSize

    // Build where clause
    const where: any = {}

    // Regular users can only see their own assigned data
    if (session.user.role === 'USER') {
      where.assignedToId = session.user.id
    }
    // Admin and SuperAdmin can see all data (no filter)

    // If IDs are provided, fetch by IDs
    if (ids) {
      const idArray = ids.split(',').filter(id => id.trim())
      if (idArray.length > 0) {
        where.id = { in: idArray }
      }
    }

    // Search filter (only if IDs not provided)
    if (search && !ids) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { number: { contains: search } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get data with pagination (skip pagination if fetching by IDs)
    const callingData = await prisma.callingData.findMany({
      where,
      skip: ids ? 0 : skip,
      take: ids ? undefined : pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    const total = ids ? callingData.length : await prisma.callingData.count({ where })

    return NextResponse.json({
      data: callingData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Error fetching calling data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

