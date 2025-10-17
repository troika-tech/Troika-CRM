import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'])
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SuperAdmin can update user status
    if (session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ 
        error: 'Only SuperAdmin can update user status' 
      }, { status: 403 })
    }

    const userId = params.id
    const body = await request.json()

    // Validate the request body
    const validatedData = updateUserStatusSchema.parse(body)

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent SuperAdmin from deactivating themselves
    if (existingUser.id === session.user.id && validatedData.status === 'INACTIVE') {
      return NextResponse.json({ 
        error: 'You cannot deactivate your own account' 
      }, { status: 400 })
    }

    // Update the user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        status: validatedData.status,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            leads: true
          }
        }
      }
    })

    return NextResponse.json({
      message: `User ${validatedData.status.toLowerCase()} successfully`,
      user: {
        ...updatedUser,
        leadsCount: updatedUser._count.leads
      }
    })

  } catch (error) {
    console.error('User status update error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error.message 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to update user status' 
    }, { status: 500 })
  }
}
