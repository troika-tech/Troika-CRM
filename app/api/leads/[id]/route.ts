import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { leadSchema } from '@/lib/validators'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadId = params.id
    const body = await request.json()

    // Validate the request body
    const validatedData = leadSchema.parse(body)

    // Check if the lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { createdBy: true }
    })

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Check if user has permission to edit this lead
    // SuperAdmin can edit all leads, Users and Admins can only edit their own leads
    const userRole = session.user.role
    const isOwner = existingLead.createdById === session.user.id

    if (userRole === 'SUPERADMIN') {
      // SuperAdmin can edit all leads - no additional check needed
    } else if (userRole === 'USER' || userRole === 'ADMIN') {
      // Users and Admins can only edit their own leads
      if (!isOwner) {
        return NextResponse.json({ 
          error: 'You do not have permission to edit this lead' 
        }, { status: 403 })
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid user role' 
      }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      customerName: validatedData.customerName,
      mobile: validatedData.mobile,
      email: validatedData.email || null,
      companyName: validatedData.companyName || null,
      industryName: validatedData.industryName || null,
      shortDescription: validatedData.shortDescription || null,
    }

    // Handle follow-up date
    if (validatedData.followUpDate) {
      updateData.followUpDate = new Date(validatedData.followUpDate)
    } else {
      updateData.followUpDate = null
    }

    // Update the lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Lead updated successfully',
      lead: updatedLead
    })

  } catch (error) {
    console.error('Lead update error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error.message 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to update lead' 
    }, { status: 500 })
  }
}
