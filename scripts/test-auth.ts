import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { signJWT, verifyJWT, SESSION_COOKIE_NAME } from '../lib/auth'

async function runTests() {
  console.log('🧪 Running Dynamic Auth Verification Tests...\n')

  // 1. Verify User exists in PostgreSQL via Prisma
  console.log('1. Checking user hexerve@gmail.com in database...')
  const user = await prisma.user.findUnique({
    where: { email: 'hexerve@gmail.com' },
  })

  if (!user) {
    throw new Error('❌ Test Failed: User hexerve@gmail.com not found in database')
  }
  console.log(`✓ Found user in DB: ID=${user.id}, Role=${user.role}, Name=${user.name}`)

  // 2. Test password hash verification with bcryptjs
  console.log('2. Verifying password comparison with bcrypt...')
  const passwordMatch = await bcrypt.compare('12345', user.password)
  if (!passwordMatch) {
    throw new Error('❌ Test Failed: Password "12345" did not match hashed password')
  }
  console.log('✓ Password "12345" successfully matched')

  const badPasswordMatch = await bcrypt.compare('wrong_pass', user.password)
  if (badPasswordMatch) {
    throw new Error('❌ Test Failed: Wrong password incorrectly matched')
  }
  console.log('✓ Wrong password rejected correctly')

  // 3. Test JWT signing & verification
  console.log('3. Testing JWT signing & verification...')
  const token = await signJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
  console.log(`✓ JWT signed: ${token.substring(0, 32)}...`)

  const payload = await verifyJWT(token)
  if (!payload || payload.userId !== user.id || payload.email !== user.email) {
    throw new Error('❌ Test Failed: JWT verification failed')
  }
  console.log(`✓ JWT verified: payload=${JSON.stringify(payload)}`)

  // 4. Test invalid token
  console.log('4. Testing invalid JWT rejection...')
  const invalidPayload = await verifyJWT('invalid.jwt.token')
  if (invalidPayload !== null) {
    throw new Error('❌ Test Failed: Invalid JWT was not rejected')
  }
  console.log('✓ Invalid JWT rejected correctly')

  console.log('\n🎉 ALL AUTHENTICATION TESTS PASSED!')
}

runTests()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

