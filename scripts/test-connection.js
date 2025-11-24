const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'))
    
    // Try to connect
    await prisma.$connect()
    console.log('✅ Connected successfully!')
    
    // Try a simple query
    const userCount = await prisma.user.count()
    console.log(`✅ Database accessible - Found ${userCount} users`)
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    if (error.meta) {
      console.error('Error details:', error.meta)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()

