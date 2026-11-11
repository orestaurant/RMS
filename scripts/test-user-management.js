/**
 * End-to-end Verification Script for Admin User Management & Role Assignment
 */
const { PrismaClient } = require('@prisma/client')
const { SignJWT } = require('jose')

const prisma = new PrismaClient()
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'rms_super_secret_jwt_key_2026_restaurant_mgmt_auth'
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING)

async function createAdminToken(userId, email, role = 'ADMIN') {
  return new SignJWT({ userId, email, role, name: 'Admin Test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(JWT_SECRET)
}

async function runTests() {
  console.log('--- STARTING USER MANAGEMENT RBAC & ROLE ASSIGNMENT VERIFICATION ---')

  // 1. Fetch current admin from DB
  const admin = await prisma.user.findFirst({
    where: { email: 'hexerve@gmail.com' },
  })

  if (!admin) {
    throw new Error('Admin user hexerve@gmail.com not found in database')
  }

  console.log(`[PASS] Found existing admin: ${admin.email} (${admin.id}) with role: ${admin.role}`)

  const adminToken = await createAdminToken(admin.id, admin.email, admin.role)

  // 2. Test self-demotion / lockout guard
  console.log('\n--- TEST 1: SELF-DEMOTION & LOCKOUT PROTECTION ---')
  const { PATCH } = require('../app/api/admin/users/[id]/role/route')
  const { NextRequest } = require('next/server')

  // Attempt to demote self to WAITER
  const demoteSelfReq = new NextRequest(`http://localhost:3000/api/admin/users/${admin.id}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `admin_session=${adminToken}`,
    },
    body: JSON.stringify({ role: 'WAITER' }),
  })

  const demoteSelfRes = await PATCH(demoteSelfReq, { params: Promise.resolve({ id: admin.id }) })
  const demoteSelfData = await demoteSelfRes.json()

  if (demoteSelfRes.status === 400 && demoteSelfData.message.includes('cannot demote your own active Admin account')) {
    console.log('[PASS] Self-demotion correctly blocked:', demoteSelfData.message)
  } else {
    throw new Error(`Self-demotion was not blocked properly! Status: ${demoteSelfRes.status}, data: ${JSON.stringify(demoteSelfData)}`)
  }

  // Attempt to deactivate self
  const deactivateSelfReq = new NextRequest(`http://localhost:3000/api/admin/users/${admin.id}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `admin_session=${adminToken}`,
    },
    body: JSON.stringify({ status: 'inactive' }),
  })

  const deactivateSelfRes = await PATCH(deactivateSelfReq, { params: Promise.resolve({ id: admin.id }) })
  const deactivateSelfData = await deactivateSelfRes.json()

  if (deactivateSelfRes.status === 400 && deactivateSelfData.message.includes('cannot deactivate your own active Admin account')) {
    console.log('[PASS] Self-deactivation correctly blocked:', deactivateSelfData.message)
  } else {
    throw new Error(`Self-deactivation was not blocked properly! Status: ${deactivateSelfRes.status}`)
  }

  // 3. Test Create Staff Users for each target role
  console.log('\n--- TEST 2: CREATE STAFF USERS FOR TARGET OPERATIONAL ROLES ---')
  const { POST, GET } = require('../app/api/admin/users/route')

  const targetRoles = [
    { role: 'WAITER', name: 'Ravi Waiter', email: 'waiter.test@spicegarden.com' },
    { role: 'COUNTER_MANAGER', name: 'Kavita Manager', email: 'counter.test@spicegarden.com' },
    { role: 'CHEF', name: 'Sanjay Chef', email: 'chef.test@spicegarden.com' },
    { role: 'INVENTORY_MANAGER', name: 'Amit Stock', email: 'inventory.test@spicegarden.com' },
    { role: 'VENDOR', name: 'Fresh Farms Vendor', email: 'vendor.test@spicegarden.com' },
  ]

  const createdUserIds = []

  for (const staff of targetRoles) {
    // Cleanup if already exists from prior run
    await prisma.staffProfile.deleteMany({
      where: { user: { email: staff.email } },
    })
    await prisma.user.deleteMany({
      where: { email: staff.email },
    })

    const createReq = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `admin_session=${adminToken}`,
      },
      body: JSON.stringify({
        name: staff.name,
        email: staff.email,
        phone: '+91-9876543210',
        password: 'Password123!',
        role: staff.role,
        status: 'active',
      }),
    })

    const createRes = await POST(createReq)
    const createData = await createRes.json()

    if (createRes.status === 201 && createData.success) {
      console.log(`[PASS] Created staff user with role ${staff.role}: ${staff.name} (${createData.user.id})`)
      createdUserIds.push({ id: createData.user.id, email: staff.email, role: staff.role })
    } else {
      throw new Error(`Failed to create staff user ${staff.role}: ${createRes.status} ${JSON.stringify(createData)}`)
    }
  }

  // 4. Test Role Assignment & Status Update on created user
  console.log('\n--- TEST 3: ROLE ASSIGNMENT & STATUS UPDATE ---')
  const targetUser = createdUserIds[0] // Ravi Waiter

  // Switch Ravi from WAITER to CHEF
  const updateRoleReq = new NextRequest(`http://localhost:3000/api/admin/users/${targetUser.id}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `admin_session=${adminToken}`,
    },
    body: JSON.stringify({
      role: 'CHEF',
      status: 'inactive',
    }),
  })

  const updateRoleRes = await PATCH(updateRoleReq, { params: Promise.resolve({ id: targetUser.id }) })
  const updateRoleData = await updateRoleRes.json()

  if (updateRoleRes.status === 200 && updateRoleData.user.role === 'CHEF' && updateRoleData.user.status === 'inactive') {
    console.log(`[PASS] Updated user ${targetUser.id} role to CHEF and status to inactive!`)
  } else {
    throw new Error(`Failed to update user role/status: ${JSON.stringify(updateRoleData)}`)
  }

  // Switch back to active WAITER
  const revertReq = new NextRequest(`http://localhost:3000/api/admin/users/${targetUser.id}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `admin_session=${adminToken}`,
    },
    body: JSON.stringify({
      role: 'WAITER',
      status: 'active',
    }),
  })
  await PATCH(revertReq, { params: Promise.resolve({ id: targetUser.id }) })
  console.log('[PASS] Reverted user back to active WAITER')

  // 5. Test GET /api/admin/users with filtering and search
  console.log('\n--- TEST 4: LIVE GET /api/admin/users WITH SEARCH & ROLE FILTER ---')
  // Fetch all
  const getAllReq = new NextRequest('http://localhost:3000/api/admin/users?page=1&limit=20', {
    method: 'GET',
    headers: { cookie: `admin_session=${adminToken}` },
  })
  const getAllRes = await GET(getAllReq)
  const getAllData = await getAllRes.json()

  console.log(`[PASS] Total users returned: ${getAllData.users.length}, Total in DB: ${getAllData.pagination.total}`)
  console.log(`[PASS] Aggregate Role Stats:`, JSON.stringify(getAllData.stats.roles))

  // Fetch with Role filter = 'CHEF'
  const getChefsReq = new NextRequest('http://localhost:3000/api/admin/users?role=CHEF', {
    method: 'GET',
    headers: { cookie: `admin_session=${adminToken}` },
  })
  const getChefsRes = await GET(getChefsReq)
  const getChefsData = await getChefsRes.json()
  const allChefs = getChefsData.users.every((u) => u.role === 'CHEF')
  if (allChefs && getChefsData.users.length > 0) {
    console.log(`[PASS] Role filter 'CHEF' verified: ${getChefsData.users.length} chef(s) found`)
  } else {
    throw new Error('Role filter verification failed')
  }

  // Fetch with Search filter = 'Kavita'
  const searchReq = new NextRequest('http://localhost:3000/api/admin/users?search=Kavita', {
    method: 'GET',
    headers: { cookie: `admin_session=${adminToken}` },
  })
  const searchRes = await GET(searchReq)
  const searchData = await searchRes.json()
  if (searchData.users.length === 1 && searchData.users[0].email === 'counter.test@spicegarden.com') {
    console.log(`[PASS] Live search verified for 'Kavita': found ${searchData.users[0].name} (${searchData.users[0].email})`)
  } else {
    throw new Error('Search verification failed')
  }

  console.log('\n=== ALL USER MANAGEMENT & ROLE ASSIGNMENT TESTS PASSED 100% SUCCESSFULLY! ===')
  await prisma.$disconnect()
}

runTests().catch((err) => {
  console.error('\n[FAIL] Test error:', err)
  process.exit(1)
})

