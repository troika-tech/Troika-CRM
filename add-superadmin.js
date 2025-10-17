// Script to add superadmin user to MongoDB
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function addSuperAdmin() {
  try {
    const email = '9664009535@troika'
    const password = 'B_LR8$i3_R-8!+.>$D8U785Rajr21'
    const name = 'Super Admin'

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('User already exists. Updating to SUPERADMIN role...')
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: 'SUPERADMIN',
          status: 'ACTIVE'
        }
      })
      console.log('✅ User updated successfully:', updatedUser.email, '- Role:', updatedUser.role)
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create superadmin user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'SUPERADMIN',
          status: 'ACTIVE'
        }
      })

      console.log('✅ Superadmin user created successfully!')
      console.log('Email:', user.email)
      console.log('Role:', user.role)
      console.log('Status:', user.status)
    }
  } catch (error) {
    console.error('Error adding superadmin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addSuperAdmin()
