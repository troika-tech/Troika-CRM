const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        status: true,
        name: true
      },
      orderBy: [
        { role: 'asc' },
        { email: 'asc' }
      ]
    })

    console.log('\n📋 Available Users in Database:\n')
    console.log('='.repeat(80))
    
    const superadmins = users.filter(u => u.role === 'SUPERADMIN')
    const admins = users.filter(u => u.role === 'ADMIN')
    const regularUsers = users.filter(u => u.role === 'USER')
    
    if (superadmins.length > 0) {
      console.log('\n🔴 SUPERADMIN Accounts:')
      superadmins.forEach(u => {
        console.log(`   Email: ${u.email}`)
        console.log(`   Name: ${u.name || 'N/A'}`)
        console.log(`   Status: ${u.status}`)
        console.log('')
      })
    }
    
    if (admins.length > 0) {
      console.log('\n🟡 ADMIN Accounts:')
      admins.forEach(u => {
        console.log(`   Email: ${u.email}`)
        console.log(`   Name: ${u.name || 'N/A'}`)
        console.log(`   Status: ${u.status}`)
        console.log('')
      })
    }
    
    if (regularUsers.length > 0) {
      console.log(`\n🟢 USER Accounts (${regularUsers.length} total):`)
      regularUsers.slice(0, 10).forEach(u => {
        console.log(`   Email: ${u.email} | Name: ${u.name || 'N/A'} | Status: ${u.status}`)
      })
      if (regularUsers.length > 10) {
        console.log(`   ... and ${regularUsers.length - 10} more users`)
      }
    }
    
    console.log('\n' + '='.repeat(80))
    console.log(`\nTotal Users: ${users.length}`)
    console.log(`Active Users: ${users.filter(u => u.status === 'ACTIVE').length}`)
    
  } catch (error) {
    console.error('Error listing users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listUsers()

