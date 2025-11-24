const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetSuperAdminPassword() {
  try {
    const email = '9664009535@troika.in'
    const newPassword = 'B_LR8$i3_R-8!+.>$D8U785Rajr21'
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('❌ User not found:', email)
      return
    }

    console.log('📋 Current user info:')
    console.log('   Email:', user.email)
    console.log('   Role:', user.role)
    console.log('   Status:', user.status)
    console.log('   Name:', user.name)
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Update user password and ensure active status
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        status: 'ACTIVE',
        role: 'SUPERADMIN'
      }
    })

    console.log('\n✅ Password reset successfully!')
    console.log('   Email:', updatedUser.email)
    console.log('   Role:', updatedUser.role)
    console.log('   Status:', updatedUser.status)
    console.log('\n🔑 Login Credentials:')
    console.log('   Email:', email)
    console.log('   Password:', newPassword)
    
  } catch (error) {
    console.error('❌ Error resetting password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetSuperAdminPassword()

