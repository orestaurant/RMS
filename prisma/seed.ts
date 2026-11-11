import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // 1. Ensure Organization exists
  const org = await prisma.organization.upsert({
    where: { slug: 'spice-garden' },
    update: {},
    create: {
      name: 'Spice Garden Hotels',
      slug: 'spice-garden',
      email: 'admin@spicegarden.com',
      phone: '+91-22-1234-5678',
      country: 'India',
      industry: 'Food & Beverage',
      subscriptionTier: 'professional',
      status: 'active',
    },
  })
  console.log(`✓ Organization ready: ${org.name} (${org.id})`)

  // 2. Ensure Restaurant exists
  const restaurant = await prisma.restaurant.upsert({
    where: { idx_restaurant_org_slug: { organizationId: org.id, slug: 'spice-garden-main' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Spice Garden',
      slug: 'spice-garden-main',
      email: 'spicegarden@example.com',
      phone: '+91-22-9876-5432',
      cuisineType: 'Indian',
      address: '123 MG Road, Mumbai Central, Mumbai',
      status: 'active',
      maxTables: 30,
      avgTableCapacity: 4,
    },
  })
  console.log(`✓ Restaurant ready: ${restaurant.name} (${restaurant.id})`)

  // 3. Ensure Branch exists
  const branch = await prisma.branch.upsert({
    where: { idx_branch_restaurant_name: { restaurantId: restaurant.id, name: 'Mumbai Central' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      organizationId: org.id,
      name: 'Mumbai Central',
      address: '456 Business Park, Mumbai Central, Mumbai',
      phone: '+91-22-5555-1111',
      email: 'mumbai@spicegarden.com',
      status: 'active',
      maxTables: 30,
      isPrimary: true,
    },
  })
  console.log(`✓ Branch ready: ${branch.name} (${branch.id})`)

  // 4. Seed user hexerve@gmail.com as specified in prompt
  const adminEmail = 'hexerve@gmail.com'
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  let user = existingUser
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('12345', 10)
    user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Rajesh',
        password: hashedPassword,
        passwordHash: hashedPassword,
        firstName: 'Rajesh',
        lastName: '',
        role: 'ADMIN' as any,
        status: 'active',
        isEmailVerified: true,
        organizationId: org.id,
      },
    })
    console.log(`✓ Created user: ${user.email} (${user.id}) [Role: ${user.role}]`)
  } else {
    // Ensure password is set to hashed '12345'
    const hashedPassword = await bcrypt.hash('12345', 10)
    user = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        name: 'Rajesh',
        password: hashedPassword,
        passwordHash: hashedPassword,
        role: 'ADMIN' as any,
        organizationId: org.id,
      },
    })
    console.log(`✓ User already exists and updated: ${user.email} (${user.id})`)
  }

  // Ensure Staff Profile exists for User
  if (user) {
    await prisma.staffProfile.upsert({
      where: { userId: user.id },
      update: {
        restaurantId: restaurant.id,
        organizationId: org.id,
      },
      create: {
        userId: user.id,
        restaurantId: restaurant.id,
        organizationId: org.id,
        designation: 'Administrator',
        employeeId: 'EMP-001',
        phoneNumber: '+91-9876543210',
        status: 'active',
      },
    })
  }

  // 5. Ensure Restaurant Settings exist
  await prisma.restaurantSettings.upsert({
    where: { restaurantId: restaurant.id },
    update: {},
    create: {
      restaurantId: restaurant.id,
      organizationId: org.id,
      taxPercentage: 5.0,
      serviceChargePercentage: 0,
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  })

  // 6. Seed menu categories & sample items
  const starterCategory = await prisma.menuCategory.upsert({
    where: { idx_category_restaurant_name: { restaurantId: restaurant.id, name: 'Appetizers' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      organizationId: org.id,
      name: 'Appetizers',
      description: 'Starters and appetizers',
      displayOrder: 1,
    },
  })

  const mainCategory = await prisma.menuCategory.upsert({
    where: { idx_category_restaurant_name: { restaurantId: restaurant.id, name: 'Main Course' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      organizationId: org.id,
      name: 'Main Course',
      description: 'Main course dishes',
      displayOrder: 2,
    },
  })

  // Ensure some tables exist for the branch
  const tableCount = await prisma.restaurantTable.count({
    where: { branchId: branch.id },
  })

  if (tableCount === 0) {
    for (let i = 1; i <= 10; i++) {
      await prisma.restaurantTable.create({
        data: {
          branchId: branch.id,
          restaurantId: restaurant.id,
          organizationId: org.id,
          tableNumber: i.toString(),
          capacity: i <= 5 ? 2 : i <= 8 ? 4 : 6,
          section: i <= 5 ? 'Indoor' : 'Outdoor',
          status: 'available',
        },
      })
    }
    console.log('✓ Created 10 restaurant tables')
  }

  console.log('\n================ SEED COMPLETE ================')
  console.log(`👤 Admin Email:    hexerve@gmail.com`)
  console.log(`🔑 Admin Password: 12345`)
  console.log(`🏢 Restaurant:     Spice Garden (Mumbai Central)`)
  console.log('================================================\n')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
