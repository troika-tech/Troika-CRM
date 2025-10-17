import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { leadSchema } from '@/lib/validators'
import { normalizePhoneNumber } from '@/lib/utils'

// Rate limiting (simple in-memory store for demo)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60 * 1000 }) // 1 minute window
    return true
  }
  
  if (userLimit.count >= 20) {
    return false
  }
  
  userLimit.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check rate limit
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 20 leads per minute.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validatedFields = leadSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validatedFields.error.issues },
        { status: 400 }
      )
    }

    const { customerName, mobile, email, companyName, industryName, followUpDate, shortDescription } = validatedFields.data

    // Normalize phone number
    const normalizedMobile = normalizePhoneNumber(mobile)

    // Verify user exists before creating lead
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const lead = await prisma.lead.create({
      data: {
        customerName,
        mobile: normalizedMobile,
        email: email || '',
        companyName,
        industryName,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        shortDescription,
        createdById: session.user.id
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(
      { message: 'Lead created successfully', lead },
      { status: 201 }
    )
  } catch (error) {
    console.error('Lead creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'createdAt:desc'
    const all = searchParams.get('all') === 'true'
    const userOnly = searchParams.get('userOnly') === 'true'
    const owner = searchParams.get('owner') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    // Check if user is admin or superadmin for viewing all leads
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN'
    const shouldShowAll = all && isAdmin

    const skip = (page - 1) * pageSize

    // Build where clause
    const where: any = {}
    
    // If userOnly is true or user is not admin, only show their own leads
    if (userOnly || !shouldShowAll) {
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

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          createdBy: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.lead.count({ where })
    ])

    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      leads,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Leads fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
