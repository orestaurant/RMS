/**
 * Database Seed Data for Restaurant Management Platform
 * 
 * This file creates demo data for development and testing:
 * - Super admin user
 * - Demo organization with complete setup
 * - Demo restaurant with branches
 * - Demo staff with role assignments
 * - Demo menu with categories and items
 * - Demo reservations and customers
 * - Sample orders and kitchen tickets
 * 
 * Run with: npx ts-node SEED_DATA.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const db = new PrismaClient();

/**
 * Seed user roles and permissions
 */
async function seedRolesAndPermissions() {
  console.log("🔐 Seeding roles and permissions...");

  const permissions = [
    // Restaurant Management
    { name: "restaurants:create", resource: "restaurants", action: "create" },
    { name: "restaurants:read", resource: "restaurants", action: "read" },
    { name: "restaurants:update", resource: "restaurants", action: "update" },
    { name: "restaurants:delete", resource: "restaurants", action: "delete" },

    // Orders
    { name: "orders:create", resource: "orders", action: "create" },
    { name: "orders:read", resource: "orders", action: "read" },
    { name: "orders:update", resource: "orders", action: "update" },
    { name: "orders:cancel", resource: "orders", action: "cancel" },

    // Kitchen
    { name: "kitchen_tickets:read", resource: "kitchen", action: "read" },
    { name: "kitchen_tickets:update", resource: "kitchen", action: "update" },

    // Billing
    { name: "bills:create", resource: "bills", action: "create" },
    { name: "bills:read", resource: "bills", action: "read" },
    { name: "payments:process", resource: "payments", action: "process" },
    { name: "refunds:create", resource: "refunds", action: "create" },

    // Menu Management
    { name: "menu:create", resource: "menu", action: "create" },
    { name: "menu:read", resource: "menu", action: "read" },
    { name: "menu:update", resource: "menu", action: "update" },

    // Inventory
    { name: "inventory:read", resource: "inventory", action: "read" },
    { name: "inventory:update", resource: "inventory", action: "update" },

    // Reports & Analytics
    { name: "reports:read", resource: "reports", action: "read" },
    { name: "analytics:read", resource: "analytics", action: "read" },
  ];

  // Create permissions (idempotent)
  for (const perm of permissions) {
    await db.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);
}

/**
 * Seed super admin user
 */
async function seedSuperAdmin() {
  console.log("👤 Seeding super admin user...");

  const hashedPassword = await bcrypt.hash("Admin@123456", 10);

  const superAdmin = await db.user.upsert({
    where: { email: "superadmin@restaurant-os.com" },
    update: {},
    create: {
      email: "superadmin@restaurant-os.com",
      phone: "+91-9876543210",
      firstName: "Super",
      lastName: "Admin",
      role: "super_admin",
      passwordHash: hashedPassword,
      isEmailVerified: true,
      isPhoneVerified: true,
      status: "active",
    },
  });

  console.log(`✅ Super admin created: ${superAdmin.email}`);
  return superAdmin;
}

/**
 * Seed demo organization
 */
async function seedOrganization() {
  console.log("🏢 Seeding demo organization...");

  const organization = await db.organization.upsert({
    where: { slug: "demo-restaurant-group" },
    update: {},
    create: {
      name: "Demo Restaurant Group",
      slug: "demo-restaurant-group",
      email: "info@demo-restaurant.com",
      phone: "+91-8765432100",
      country: "India",
      industry: "Food & Beverage",
      subscriptionTier: "pro",
      status: "active",
      logoUrl: "https://via.placeholder.com/200x200?text=Demo+Restaurant",
      websiteUrl: "https://demo-restaurant.com",
      metadata: {
        totalRestaurants: 2,
        setupDate: new Date().toISOString(),
        aiSetupCompleted: true,
      },
    },
  });

  console.log(`✅ Organization created: ${organization.name} (${organization.id})`);
  return organization;
}

/**
 * Seed demo restaurant
 */
async function seedRestaurant(organizationId: string) {
  console.log("🍽️  Seeding demo restaurant...");

  const restaurant = await db.restaurant.upsert({
    where: {
      organizationId_slug: {
        organizationId,
        slug: "pizza-palace",
      },
    },
    update: {},
    create: {
      organizationId,
      name: "Pizza Palace",
      slug: "pizza-palace",
      email: "pizza@demo.com",
      phone: "+91-7654321000",
      cuisineType: "Italian",
      address: "123 Food Street, Downtown, City",
      latitude: 28.6139,
      longitude: 77.209,
      gstNumber: "18AABCU1234A1Z0",
      fssaiNumber: "10001234001234",
      establishmentDate: new Date("2020-01-15"),
      status: "active",
      logoUrl: "https://via.placeholder.com/200x200?text=Pizza+Palace",
      maxTables: 25,
      avgTableCapacity: 4,
      operatingHours: {
        monday: { open: "11:00", close: "23:00" },
        tuesday: { open: "11:00", close: "23:00" },
        wednesday: { open: "11:00", close: "23:00" },
        thursday: { open: "11:00", close: "23:00" },
        friday: { open: "11:00", close: "00:00" },
        saturday: { open: "10:00", close: "00:00" },
        sunday: { open: "10:00", close: "23:00" },
      },
      metadata: {
        averageRating: 4.5,
        totalOrders: 0,
        aiSetupCompleted: true,
      },
    },
  });

  // Create restaurant settings
  await db.restaurantSettings.upsert({
    where: { restaurantId: restaurant.id },
    update: {},
    create: {
      restaurantId: restaurant.id,
      organizationId,
      taxPercentage: 5.0,
      serviceChargePercentage: 2.5,
      discountAllowed: true,
      reservationAdvancePaymentPercentage: 10,
      reservationCancellationHours: 24,
      reservationNoShowPenalty: 100,
      qrOrderAutoApprove: false,
      kitchenPrintEnabled: true,
      splitBillAllowed: true,
      advancePaymentRequired: false,
      currency: "INR",
      timezone: "Asia/Kolkata",
      aiSetupCompleted: true,
    },
  });

  console.log(`✅ Restaurant created: ${restaurant.name} (${restaurant.id})`);
  return restaurant;
}

/**
 * Seed demo branches
 */
async function seedBranches(
  restaurantId: string,
  organizationId: string
) {
  console.log("🏪 Seeding demo branches...");

  const branch1 = await db.branch.upsert({
    where: {
      restaurantId_name: {
        restaurantId,
        name: "Downtown Branch",
      },
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      name: "Downtown Branch",
      address: "123 Food Street, Downtown, City",
      latitude: 28.6139,
      longitude: 77.209,
      phone: "+91-7654321001",
      email: "downtown@pizza-demo.com",
      status: "active",
      maxTables: 20,
      isPrimary: true,
      metadata: { capacity: 80, floors: 2 },
    },
  });

  const branch2 = await db.branch.upsert({
    where: {
      restaurantId_name: {
        restaurantId,
        name: "Airport Branch",
      },
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      name: "Airport Branch",
      address: "Terminal 3, Airport Road, City",
      latitude: 28.5595,
      longitude: 77.1003,
      phone: "+91-7654321002",
      email: "airport@pizza-demo.com",
      status: "active",
      maxTables: 15,
      isPrimary: false,
      metadata: { capacity: 60, floors: 1 },
    },
  });

  console.log(`✅ Created 2 branches`);
  return [branch1, branch2];
}

/**
 * Seed demo staff users
 */
async function seedStaff(
  organizationId: string,
  restaurantId: string,
  branches: any[]
) {
  console.log("👨‍💼 Seeding demo staff...");

  const staffMembers = [];
  const staffRoles = [
    {
      email: "owner@demo.com",
      role: "restaurant_owner" as const,
      name: "John",
      designation: "Owner",
    },
    {
      email: "manager@demo.com",
      role: "branch_manager" as const,
      name: "Sarah",
      designation: "Branch Manager",
    },
    {
      email: "waiter1@demo.com",
      role: "waiter" as const,
      name: "Mike",
      designation: "Waiter",
    },
    {
      email: "waiter2@demo.com",
      role: "waiter" as const,
      name: "Emma",
      designation: "Waiter",
    },
    {
      email: "chef@demo.com",
      role: "chef" as const,
      name: "Marco",
      designation: "Head Chef",
    },
    {
      email: "cashier@demo.com",
      role: "cashier" as const,
      name: "Priya",
      designation: "Cashier",
    },
  ];

  for (const staffRole of staffRoles) {
    const hashedPassword = await bcrypt.hash("Staff@123456", 10);

    const user = await db.user.upsert({
      where: { email: staffRole.email },
      update: {},
      create: {
        email: staffRole.email,
        firstName: staffRole.name,
        lastName: "Demo",
        role: staffRole.role,
        passwordHash: hashedPassword,
        isEmailVerified: true,
        status: "active",
        organizationId,
      },
    });

    // Create staff profile
    const profile = await db.staffProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {},
      create: {
        userId: user.id,
        restaurantId,
        organizationId,
        designation: staffRole.designation,
        employeeId: `EMP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        hireDate: new Date(),
        status: "active",
      },
    });

    // Assign to branches
    for (const branch of branches) {
      await db.staffBranchAssignment.upsert({
        where: {
          staffId_branchId: {
            staffId: profile.id,
            branchId: branch.id,
          },
        },
        update: { isActive: true },
        create: {
          staffId: profile.id,
          branchId: branch.id,
          organizationId,
          restaurantId,
          isActive: true,
        },
      });
    }

    staffMembers.push({ user, profile });
  }

  console.log(`✅ Created ${staffMembers.length} staff members`);
  return staffMembers;
}

/**
 * Seed demo menu
 */
async function seedMenu(restaurantId: string, organizationId: string) {
  console.log("🍕 Seeding demo menu...");

  // Categories
  const pizzaCategory = await db.menuCategory.upsert({
    where: {
      restaurantId_name_deletedAt: {
        restaurantId,
        name: "Pizzas",
        deletedAt: null,
      },
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      name: "Pizzas",
      description: "Our signature pizzas with authentic Italian flavors",
      displayOrder: 1,
      status: "active",
      isActive: true,
    },
  });

  const pastaCategory = await db.menuCategory.upsert({
    where: {
      restaurantId_name_deletedAt: {
        restaurantId,
        name: "Pastas",
        deletedAt: null,
      },
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      name: "Pastas",
      description: "Freshly prepared Italian pasta dishes",
      displayOrder: 2,
      status: "active",
      isActive: true,
    },
  });

  const beveragesCategory = await db.menuCategory.upsert({
    where: {
      restaurantId_name_deletedAt: {
        restaurantId,
        name: "Beverages",
        deletedAt: null,
      },
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      name: "Beverages",
      description: "Refreshing drinks and beverages",
      displayOrder: 3,
      status: "active",
      isActive: true,
    },
  });

  // Menu Items - Pizzas
  const margherita = await db.menuItem.upsert({
    where: {
      id: "pizza-margherita", // Mock UUID
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      categoryId: pizzaCategory.id,
      name: "Margherita Pizza",
      description: "Fresh mozzarella, tomato sauce, and basil",
      basePrice: 350,
      costPrice: 120,
      isVegetarian: true,
      preparationTimeMinutes: 20,
      isAvailable: true,
      status: "active",
      displayOrder: 1,
    },
  });

  const pepperoni = await db.menuItem.upsert({
    where: {
      id: "pizza-pepperoni",
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      categoryId: pizzaCategory.id,
      name: "Pepperoni Pizza",
      description: "Loaded with pepperoni and mozzarella",
      basePrice: 400,
      costPrice: 140,
      isVegetarian: false,
      preparationTimeMinutes: 22,
      isAvailable: true,
      status: "active",
      displayOrder: 2,
    },
  });

  // Menu Items - Pasta
  const alfredo = await db.menuItem.upsert({
    where: {
      id: "pasta-alfredo",
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      categoryId: pastaCategory.id,
      name: "Fettuccine Alfredo",
      description: "Creamy parmesan sauce with fresh pasta",
      basePrice: 320,
      costPrice: 110,
      isVegetarian: true,
      preparationTimeMinutes: 18,
      isAvailable: true,
      status: "active",
      displayOrder: 1,
    },
  });

  // Menu Items - Beverages
  const coke = await db.menuItem.upsert({
    where: {
      id: "beverage-coke",
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      categoryId: beveragesCategory.id,
      name: "Coca Cola",
      description: "Ice-cold Coca Cola",
      basePrice: 80,
      costPrice: 25,
      isVegetarian: true,
      preparationTimeMinutes: 2,
      isAvailable: true,
      status: "active",
      displayOrder: 1,
    },
  });

  // Modifiers
  const toppingsGroup = await db.modifierGroup.upsert({
    where: {
      restaurantId_name_deletedAt: {
        restaurantId,
        name: "Extra Toppings",
        deletedAt: null,
      },
    },
    update: {},
    create: {
      restaurantId,
      organizationId,
      name: "Extra Toppings",
      isRequired: false,
      minSelections: 0,
      maxSelections: 5,
      status: "active",
    },
  });

  await db.modifier.upsert({
    where: {
      id: "modifier-extra-cheese",
    },
    update: {},
    create: {
      modifierGroupId: toppingsGroup.id,
      organizationId,
      name: "Extra Cheese",
      priceModifier: 50,
      isAvailable: true,
    },
  });

  await db.modifier.upsert({
    where: {
      id: "modifier-mushrooms",
    },
    update: {},
    create: {
      modifierGroupId: toppingsGroup.id,
      organizationId,
      name: "Mushrooms",
      priceModifier: 40,
      isAvailable: true,
    },
  });

  // Link modifiers to items
  await db.menuItemModifierGroup.upsert({
    where: {
      menuItemId_modifierGroupId: {
        menuItemId: margherita.id,
        modifierGroupId: toppingsGroup.id,
      },
    },
    update: {},
    create: {
      menuItemId: margherita.id,
      modifierGroupId: toppingsGroup.id,
      organizationId,
    },
  });

  console.log(`✅ Seeded menu with items and modifiers`);
  return {
    categories: [pizzaCategory, pastaCategory, beveragesCategory],
    items: [margherita, pepperoni, alfredo, coke],
  };
}

/**
 * Seed demo tables
 */
async function seedTables(
  branchId: string,
  restaurantId: string,
  organizationId: string
) {
  console.log("🪑 Seeding demo tables...");

  const tables = [];
  for (let i = 1; i <= 10; i++) {
    const table = await db.restaurantTable.upsert({
      where: {
        branchId_tableNumber_deletedAt: {
          branchId,
          tableNumber: `T${i}`,
          deletedAt: null,
        },
      },
      update: {},
      create: {
        branchId,
        restaurantId,
        organizationId,
        tableNumber: `T${i}`,
        capacity: i <= 5 ? 4 : 6,
        section: i <= 5 ? "Indoor" : "Outdoor",
        status: "available",
        color: i % 2 === 0 ? "#FF6B6B" : "#4ECDC4",
      },
    });

    // Generate QR token
    await db.tableQrToken.upsert({
      where: {
        token: `qr-token-${branchId}-t${i}`,
      },
      update: {},
      create: {
        tableId: table.id,
        branchId,
        restaurantId,
        organizationId,
        token: `qr-token-${branchId}-t${i}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://app.restaurant-os.com/order/${branchId}/t${i}`,
        isActive: true,
      },
    });

    tables.push(table);
  }

  console.log(`✅ Created ${tables.length} tables with QR tokens`);
  return tables;
}

/**
 * Seed demo kitchen sections
 */
async function seedKitchenSections(
  branchId: string,
  restaurantId: string,
  organizationId: string
) {
  console.log("👨‍🍳 Seeding kitchen sections...");

  const sections = [
    { name: "Grill Section", type: "grill" },
    { name: "Prep Section", type: "prep" },
    { name: "Pizza Oven", type: "pizza" },
    { name: "Beverage Station", type: "beverages" },
  ];

  const createdSections = [];
  for (const section of sections) {
    const created = await db.kitchenSection.upsert({
      where: {
        branchId_name_deletedAt: {
          branchId,
          name: section.name,
          deletedAt: null,
        },
      },
      update: {},
      create: {
        branchId,
        restaurantId,
        organizationId,
        name: section.name,
        sectionType: section.type,
        isActive: true,
      },
    });
    createdSections.push(created);
  }

  console.log(`✅ Created ${createdSections.length} kitchen sections`);
  return createdSections;
}

/**
 * Seed demo customers
 */
async function seedCustomers(organizationId: string) {
  console.log("👥 Seeding demo customers...");

  const customers = [];
  const customerData = [
    { phone: "+91-9876543210", email: "john@example.com", name: "John Doe" },
    {
      phone: "+91-8765432109",
      email: "jane@example.com",
      name: "Jane Smith",
    },
    {
      phone: "+91-7654321098",
      email: "bob@example.com",
      name: "Bob Johnson",
    },
  ];

  for (const data of customerData) {
    const customer = await db.customer.upsert({
      where: {
        organizationId_phone_deletedAt: {
          organizationId,
          phone: data.phone,
          deletedAt: null,
        },
      },
      update: {},
      create: {
        organizationId,
        phone: data.phone,
        email: data.email,
        firstName: data.name.split(" ")[0],
        lastName: data.name.split(" ")[1],
        status: "active",
        totalOrders: 0,
        totalSpent: 0,
      },
    });

    // Create loyalty points
    await db.customerLoyaltyPoints.upsert({
      where: { customerId: customer.id },
      update: {},
      create: {
        customerId: customer.id,
        organizationId,
        pointsBalance: 1000,
        lifetimePoints: 1000,
      },
    });

    customers.push(customer);
  }

  console.log(`✅ Created ${customers.length} demo customers`);
  return customers;
}

/**
 * Main seed function
 */
async function main() {
  try {
    console.log("\n🌱 Starting database seeding...\n");

    // Step 1: Seed roles and permissions
    await seedRolesAndPermissions();

    // Step 2: Seed super admin
    await seedSuperAdmin();

    // Step 3: Seed organization
    const organization = await seedOrganization();

    // Step 4: Seed restaurant
    const restaurant = await seedRestaurant(organization.id);

    // Step 5: Seed branches
    const branches = await seedBranches(restaurant.id, organization.id);

    // Step 6: Seed staff
    const staff = await seedStaff(organization.id, restaurant.id, branches);

    // Step 7: Seed menu
    const menu = await seedMenu(restaurant.id, organization.id);

    // Step 8: Seed tables (for first branch)
    const tables = await seedTables(
      branches[0].id,
      restaurant.id,
      organization.id
    );

    // Step 9: Seed kitchen sections
    const kitchenSections = await seedKitchenSections(
      branches[0].id,
      restaurant.id,
      organization.id
    );

    // Step 10: Seed customers
    const customers = await seedCustomers(organization.id);

    console.log("\n✨ Database seeding completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`  - Organization: 1`);
    console.log(`  - Restaurants: 1`);
    console.log(`  - Branches: ${branches.length}`);
    console.log(`  - Staff Members: ${staff.length}`);
    console.log(`  - Menu Items: ${menu.items.length}`);
    console.log(`  - Tables: ${tables.length}`);
    console.log(`  - Kitchen Sections: ${kitchenSections.length}`);
    console.log(`  - Customers: ${customers.length}`);

    console.log("\n🔑 Default Credentials:");
    console.log(`  - Super Admin Email: superadmin@restaurant-os.com`);
    console.log(`  - Password: Admin@123456`);
    console.log(`  - Owner Email: owner@demo.com`);
    console.log(`  - Password: Staff@123456`);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run if executed directly
main();
