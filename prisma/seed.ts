import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')
  console.log('ℹ️  No dummy data will be created.')
  console.log('✅ Database is ready for use.')
  console.log('')
  console.log('💡 You can now register your first user through the application.')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
