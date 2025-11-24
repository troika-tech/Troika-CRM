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

    // Only Admin and SuperAdmin can view assignment history
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const skip = (page - 1) * pageSize

    // Build where clause
    const where: any = {}

    // Admin can only see their own assignments, SuperAdmin sees all
    if (session.user.role === 'ADMIN') {
      where.assignedById = session.user.id
    }
    // SuperAdmin sees all (no filter)

    // Get unique assignments grouped by assignedById and createdAt (within same minute)
    // We'll group by assignedById and a time window
    const allAssignments = await prisma.callingData.findMany({
      where,
      select: {
        assignedById: true,
        assignedToId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group assignments by assignedById and date (same day)
    const assignmentGroups = new Map<string, {
      assignedById: string
      assignedToId: string
      createdAt: Date
      count: number
    }>()

    allAssignments.forEach((item) => {
      const dateKey = new Date(item.createdAt).toISOString().split('T')[0]
      const key = `${item.assignedById}-${item.assignedToId}-${dateKey}`
      
      if (assignmentGroups.has(key)) {
        const group = assignmentGroups.get(key)!
        group.count += 1
      } else {
        assignmentGroups.set(key, {
          assignedById: item.assignedById,
          assignedToId: item.assignedToId,
          createdAt: item.createdAt,
          count: 1,
        })
      }
    })

    // Convert to array and sort by date
    const assignments = Array.from(assignmentGroups.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Paginate
    const paginatedAssignments = assignments.slice(skip, skip + pageSize)

    // Get user details for each assignment
    const assignmentsWithDetails = await Promise.all(
      paginatedAssignments.map(async (assignment) => {
        const [assignedBy, assignedTo] = await Promise.all([
          prisma.user.findUnique({
            where: { id: assignment.assignedById },
            select: { id: true, name: true, email: true },
          }),
          prisma.user.findUnique({
            where: { id: assignment.assignedToId },
            select: { id: true, name: true, email: true },
          }),
        ])

        // Get the actual records for this assignment
        const records = await prisma.callingData.findMany({
          where: {
            assignedById: assignment.assignedById,
            assignedToId: assignment.assignedToId,
            createdAt: {
              gte: new Date(new Date(assignment.createdAt).setHours(0, 0, 0, 0)),
              lt: new Date(new Date(assignment.createdAt).setHours(23, 59, 59, 999)),
            },
          },
          select: {
            id: true,
            name: true,
            number: true,
            companyName: true,
            designation: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        return {
          id: `${assignment.assignedById}-${assignment.assignedToId}-${new Date(assignment.createdAt).toISOString().split('T')[0]}`,
          assignedBy: assignedBy || { id: '', name: null, email: '' },
          assignedTo: assignedTo || { id: '', name: null, email: '' },
          createdAt: assignment.createdAt,
          recordCount: assignment.count,
          records,
        }
      })
    )

    return NextResponse.json({
      data: assignmentsWithDetails,
      pagination: {
        page,
        pageSize,
        total: assignments.length,
        totalPages: Math.ceil(assignments.length / pageSize),
      },
    })
  } catch (error) {
    console.error('Error fetching assignment history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

