import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (status === undefined || status === null) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Find the calling data record
    const callingData = await prisma.callingData.findUnique({
      where: { id: params.id },
      select: { assignedToId: true }
    })

    if (!callingData) {
      return NextResponse.json({ error: 'Calling data not found' }, { status: 404 })
    }

    // Regular users can only update their own assigned data
    if (session.user.role === 'USER' && callingData.assignedToId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update the status
    const updated = await prisma.callingData.update({
      where: { id: params.id },
      data: {
        status: String(status).trim() || null,
      },
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
      success: true,
      data: updated,
      message: 'Status updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating calling data:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}

