import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let record
    try {
      record = await prisma.callingAgentLead.findUnique({
        where: { id: params.id },
        include: {
          crmUser: { select: { id: true, name: true, email: true } },
        },
      })
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const role = session.user.role
    if (role !== 'SUPERADMIN') {
      if (role === 'ADMIN') {
        const adminUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { assignedUserIds: true },
        })
        const ids = adminUser?.assignedUserIds || []
        if (!record.crmUserId || !ids.includes(record.crmUserId)) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }
      } else {
        if (record.crmUserId !== session.user.id) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }
      }
    }

    return NextResponse.json({ record })
  } catch (err) {
    console.error('[CallingAgentLeads] detail error', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
