const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('No organization found');
    process.exit(1);
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { organizationId: org.id },
  });

  const branch = await prisma.branch.findFirst({
    where: { organizationId: org.id },
  });

  const passwordHash = await bcrypt.hash('12345', 10);

  // 1. Inventory Manager
  const invManager = await prisma.user.upsert({
    where: { email: 'inventory@spicegarden.com' },
    update: {
      role: 'INVENTORY_MANAGER',
      password: passwordHash,
      passwordHash: passwordHash,
      name: 'Priya Sharma (Inventory Lead)',
    },
    create: {
      email: 'inventory@spicegarden.com',
      name: 'Priya Sharma (Inventory Lead)',
      firstName: 'Priya',
      lastName: 'Sharma',
      role: 'INVENTORY_MANAGER',
      password: passwordHash,
      passwordHash: passwordHash,
      organizationId: org.id,
      status: 'active',
      isEmailVerified: true,
    },
  });
  console.log('✓ Inventory Manager user:', invManager.email, invManager.id);

  // 2. Vendor 1
  const vendor1 = await prisma.user.upsert({
    where: { email: 'vendor@spicegarden.com' },
    update: {
      role: 'VENDOR',
      password: passwordHash,
      passwordHash: passwordHash,
      name: 'Apex Agri & Oil Supplies',
    },
    create: {
      email: 'vendor@spicegarden.com',
      name: 'Apex Agri & Oil Supplies',
      firstName: 'Apex',
      lastName: 'Supplies',
      role: 'VENDOR',
      password: passwordHash,
      passwordHash: passwordHash,
      organizationId: org.id,
      status: 'active',
      isEmailVerified: true,
    },
  });
  console.log('✓ Vendor 1 user:', vendor1.email, vendor1.id);

  // 3. Vendor 2
  const vendor2 = await prisma.user.upsert({
    where: { email: 'freshfarms@spicegarden.com' },
    update: {
      role: 'VENDOR',
      password: passwordHash,
      passwordHash: passwordHash,
      name: 'FreshFarms Dairy & Grains',
    },
    create: {
      email: 'freshfarms@spicegarden.com',
      name: 'FreshFarms Dairy & Grains',
      firstName: 'FreshFarms',
      lastName: 'Grains',
      role: 'VENDOR',
      password: passwordHash,
      passwordHash: passwordHash,
      organizationId: org.id,
      status: 'active',
      isEmailVerified: true,
    },
  });
  console.log('✓ Vendor 2 user:', vendor2.email, vendor2.id);

  // Ensure StaffProfile for invManager if restaurant exists
  if (restaurant) {
    await prisma.staffProfile.upsert({
      where: { userId: invManager.id },
      update: { designation: 'Inventory Manager' },
      create: {
        userId: invManager.id,
        restaurantId: restaurant.id,
        organizationId: org.id,
        designation: 'Inventory Manager',
        employeeId: 'INV-001',
        status: 'active',
      },
    }).catch(() => {});
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed roles complete.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
