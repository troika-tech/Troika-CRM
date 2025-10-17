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
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'createdAt:desc'
    const all = searchParams.get('all') === 'true'
    const owner = searchParams.get('owner') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    // Check if user is admin or superadmin for viewing all leads
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN'
    const shouldShowAll = all && isAdmin

    // Build where clause
    const where: any = {}
    
    if (!shouldShowAll) {
      where.createdById = session.user.id
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { industryName: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (owner) {
      where.createdBy = {
        email: { contains: owner, mode: 'insensitive' }
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    // Build orderBy clause
    const [sortField, sortOrder] = sort.split(':')
    const orderBy: any = {}
    orderBy[sortField] = sortOrder

    const leads = await prisma.lead.findMany({
      where,
      orderBy,
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Convert to CSV format
    const csvHeaders = isAdmin 
      ? ['Customer Name', 'Mobile', 'Email', 'Company Name', 'Industry Name', 'Short Description', 'Follow-up Date', 'Owner', 'Created At']
      : ['Customer Name', 'Mobile', 'Email', 'Company Name', 'Industry Name', 'Short Description', 'Follow-up Date', 'Created At']

    const csvRows = leads.map(lead => {
      const baseRow = [
        lead.customerName,
        lead.mobile,
        lead.email,
        lead.companyName || '',
        lead.industryName || '',
        lead.shortDescription || '',
        lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-US') : '',
        new Date(lead.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      ]

      if (isAdmin) {
        baseRow.splice(7, 0, lead.createdBy?.name || lead.createdBy?.email || 'Unknown')
      }

      return baseRow.map(field => `"${field}"`).join(',')
    })

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `leads_export_${timestamp}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
