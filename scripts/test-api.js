const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testAPI() {
  try {
    console.log('Testing API queries...\n')
    
    // Test ADMIN query
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        assignedUserIds: true,
        createdAt: true,
        _count: {
          select: {
            leads: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    console.log(`✅ Found ${admins.length} admins:`)
    admins.forEach(admin => {
      console.log(`  - ${admin.name} (${admin.email}) - Status: ${admin.status}`)
    })
    
    // Test USER query
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        assignedUserIds: true,
        createdAt: true,
        _count: {
          select: {
            leads: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    console.log(`\n✅ Found ${users.length} users:`)
    users.slice(0, 5).forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Status: ${user.status}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testAPI()

