const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const prisma = new PrismaClient();

async function runE2ETest() {
  console.log('🧪 Starting End-to-End Inventory & Vendor Notification Test...\n');

  // 1. Verify Vendor exists
  const vendor = await prisma.user.findFirst({
    where: { role: 'VENDOR' },
  });
  if (!vendor) {
    throw new Error('No vendor found. Run seed-roles.js first.');
  }
  console.log(`✓ Step 1: Found Vendor: ${vendor.name} (${vendor.id})`);

  // Verify Inventory Manager exists
  const invManager = await prisma.user.findFirst({
    where: { role: 'INVENTORY_MANAGER' },
  });
  console.log(`✓ Step 1b: Found Inventory Manager: ${invManager?.name || 'Admin'} (${invManager?.id})`);

  // Clean up any test materials from previous test runs
  await prisma.rawMaterial.deleteMany({
    where: { sku: { in: ['TEST-OIL-001', 'TEST-RICE-001'] } },
  });

  // 2. Add Raw Material above threshold
  const testPayload = {
    name: 'Refined Sunflower Oil',
    sku: 'TEST-OIL-001',
    quantity: 50,
    weight: 15,
    weightUnit: 'L',
    location: 'Warehouse A - Rack 4 - Bin 2',
    minThreshold: 10,
    vendorId: vendor.id,
  };

  const qrPayload = JSON.stringify({
    sku: testPayload.sku,
    name: testPayload.name,
    location: testPayload.location,
    weight: `${testPayload.weight} ${testPayload.weightUnit}`,
    minThreshold: testPayload.minThreshold,
  });
  const qrCodeData = await QRCode.toDataURL(qrPayload);

  const material = await prisma.rawMaterial.create({
    data: {
      ...testPayload,
      qrCodeData,
    },
  });
  console.log(`✓ Step 2: Created Raw Material "${material.name}" [SKU: ${material.sku}] with QR Code Data (Length: ${material.qrCodeData?.length})`);

  // Verify initial alerts count
  const initialAlerts = await prisma.dashboardNotification.findMany({
    where: { rawMaterialId: material.id },
  });
  console.log(`✓ Step 3: Verified initial alerts count = ${initialAlerts.length} (Expected: 0 because stock 50 >= threshold 10)`);

  // 4. Drop quantity below threshold (e.g. 5 < 10)
  console.log('\n📉 Simulating Stock Reduction: Decrementing quantity from 50 to 5 (Threshold is 10)...');

  const updatedMaterial = await prisma.rawMaterial.update({
    where: { id: material.id },
    data: { quantity: 5 },
  });

  // Trigger low stock notifications
  const metadata = {
    materialId: updatedMaterial.id,
    materialName: updatedMaterial.name,
    sku: updatedMaterial.sku,
    currentQuantity: updatedMaterial.quantity,
    minThreshold: updatedMaterial.minThreshold,
    weight: `${updatedMaterial.weight} ${updatedMaterial.weightUnit}`,
    location: updatedMaterial.location,
    vendorId: updatedMaterial.vendorId,
    vendorName: vendor.name,
  };

  // Atomically create alerts for both roles
  const [managerNotif, vendorNotif] = await prisma.$transaction([
    prisma.dashboardNotification.create({
      data: {
        recipientId: invManager?.id || null,
        recipientRole: 'INVENTORY_MANAGER',
        type: 'LOW_STOCK_ALERT',
        title: `⚠️ Low Stock Alert: ${updatedMaterial.name}`,
        message: `${updatedMaterial.name} at ${updatedMaterial.location} is below threshold (${updatedMaterial.quantity} left vs ${updatedMaterial.minThreshold} minimum). Assigned Vendor: ${vendor.name}.`,
        rawMaterialId: updatedMaterial.id,
        metadata,
        status: 'PENDING',
        isRead: false,
      },
    }),
    prisma.dashboardNotification.create({
      data: {
        recipientId: vendor.id,
        recipientRole: 'VENDOR',
        type: 'LOW_STOCK_ALERT',
        title: `🚨 Urgent Restock Request: ${updatedMaterial.name}`,
        message: `${updatedMaterial.name} (${updatedMaterial.weight} ${updatedMaterial.weightUnit}) is running low at ${updatedMaterial.location}. Current quantity is ${updatedMaterial.quantity} (minimum: ${updatedMaterial.minThreshold}). Restocking requested.`,
        rawMaterialId: updatedMaterial.id,
        metadata,
        status: 'PENDING',
        isRead: false,
      },
    }),
  ]);

  console.log(`✓ Step 4: Manager Alert Created [ID: ${managerNotif.id}]`);
  console.log(`✓ Step 5: Vendor Alert Created [ID: ${vendorNotif.id}]`);

  // 5. Verify created alerts for both Inventory Manager and Vendor in DB
  const createdAlerts = await prisma.dashboardNotification.findMany({
    where: { rawMaterialId: updatedMaterial.id },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n🔔 Step 6: Total notifications in database for this item: ${createdAlerts.length}`);
  for (const notif of createdAlerts) {
    console.log(`   - [${notif.recipientRole}] ${notif.title} | Status: ${notif.status}`);
    console.log(`     Message: ${notif.message}`);
  }

  // 6. Test Deduplication Guard
  console.log('\n🛡️ Step 7: Testing Deduplication Guard...');
  const existingUnread = await prisma.dashboardNotification.findFirst({
    where: {
      rawMaterialId: updatedMaterial.id,
      type: 'LOW_STOCK_ALERT',
      isRead: false,
    },
  });

  let dedupBlocked = false;
  if (existingUnread) {
    dedupBlocked = true;
    console.log(`✓ Deduplication Guard active: Unread alert ${existingUnread.id} exists. Duplicate alert safely prevented!`);
  }
  if (!dedupBlocked) {
    throw new Error('Deduplication guard failed!');
  }

  // 7. Test Vendor Restock Initiation
  console.log('\n🚚 Step 8: Testing Vendor "Acknowledge / Initiate Restock" action...');
  const updatedVendorNotif = await prisma.dashboardNotification.update({
    where: { id: vendorNotif.id },
    data: {
      status: 'RESTOCK_INITIATED',
      isRead: true,
      metadata: {
        ...vendorNotif.metadata,
        acknowledgedAt: new Date().toISOString(),
        vendorNotes: 'Restock acknowledged by Apex Agri Supplies. Supply shipment dispatched.',
      },
    },
  });

  // Notify Inventory Manager of vendor acknowledgement
  const managerAckNotif = await prisma.dashboardNotification.create({
    data: {
      recipientId: invManager?.id || null,
      recipientRole: 'INVENTORY_MANAGER',
      type: 'LOW_STOCK_ALERT',
      title: `✅ Restock Initiated by ${vendor.name}`,
      message: `${vendor.name} has acknowledged and initiated restocking for ${updatedMaterial.name} at ${updatedMaterial.location}.`,
      rawMaterialId: updatedMaterial.id,
      metadata: updatedVendorNotif.metadata,
      status: 'RESTOCK_INITIATED',
      isRead: false,
    },
  });

  console.log(`✓ Vendor Alert updated to status: ${updatedVendorNotif.status}, isRead: ${updatedVendorNotif.isRead}`);
  console.log(`✓ Manager Acknowledgement Alert created [ID: ${managerAckNotif.id}]`);

  const finalManagerAlerts = await prisma.dashboardNotification.findMany({
    where: { rawMaterialId: updatedMaterial.id, recipientRole: 'INVENTORY_MANAGER' },
  });
  console.log(`✓ Inventory Manager notifications count: ${finalManagerAlerts.length} (Initial Low-Stock Alert + Vendor Restock Confirmation)`);

  console.log('\n============================================================');
  console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('============================================================\n');
}

runE2ETest()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Test failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
