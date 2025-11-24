import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaUrl: string | undefined
}

// Get current DATABASE_URL
const currentDatabaseUrl = process.env.DATABASE_URL

// Check if we need to recreate the client (URL changed or doesn't exist)
const shouldRecreateClient = 
  !globalForPrisma.prisma || 
  globalForPrisma.prismaUrl !== currentDatabaseUrl

if (shouldRecreateClient) {
  // Disconnect old client if it exists
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect().catch(() => {})
  }
  
  // Create new client with current URL
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
  globalForPrisma.prismaUrl = currentDatabaseUrl
}

export const prisma = globalForPrisma.prisma!

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
