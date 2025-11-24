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

    // Only users can view their campaigns
    if (session.user.role !== 'USER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const skip = (page - 1) * pageSize

    // Get all calling data assigned to this user
    const allData = await prisma.callingData.findMany({
      where: {
        assignedToId: session.user.id,
      },
      select: {
        id: true,
        assignedById: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by assignedById and date (same day)
    const campaignGroups = new Map<string, {
      assignedById: string
      createdAt: Date
      count: number
      recordIds: string[]
    }>()

    allData.forEach((item) => {
      const dateKey = new Date(item.createdAt).toISOString().split('T')[0]
      const key = `${item.assignedById}-${dateKey}`
      
      if (campaignGroups.has(key)) {
        const group = campaignGroups.get(key)!
        group.count += 1
        group.recordIds.push(item.id)
      } else {
        campaignGroups.set(key, {
          assignedById: item.assignedById,
          createdAt: item.createdAt,
          count: 1,
          recordIds: [item.id],
        })
      }
    })

    // Convert to array and sort by date
    const campaigns = Array.from(campaignGroups.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Paginate
    const paginatedCampaigns = campaigns.slice(skip, skip + pageSize)

    // Get user details for assignedBy
    const assignedByIds = [...new Set(paginatedCampaigns.map(c => c.assignedById))]
    const users = await prisma.user.findMany({
      where: {
        id: { in: assignedByIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    const userMap = new Map(users.map(user => [user.id, user]))

    // Format campaigns with user details
    const campaignsWithDetails = paginatedCampaigns.map(campaign => ({
      id: `${campaign.assignedById}-${new Date(campaign.createdAt).toISOString().split('T')[0]}`,
      assignedBy: userMap.get(campaign.assignedById) || { name: null, email: 'Unknown' },
      recordCount: campaign.count,
      createdAt: campaign.createdAt,
      recordIds: campaign.recordIds,
    }))

    return NextResponse.json({
      campaigns: campaignsWithDetails,
      pagination: {
        page,
        pageSize,
        total: campaigns.length,
        totalPages: Math.ceil(campaigns.length / pageSize),
      },
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

