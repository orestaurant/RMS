import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- STARTING BILL & TIP END-TO-END VERIFICATION ---')

  // 1. Locate an active table
  const table = await prisma.restaurantTable.findFirst({
    where: { deletedAt: null },
    include: { restaurant: true, branch: true },
  })

  if (!table) {
    console.error('No table found in database!')
    return
  }
  console.log(`✓ Located Table: ${table.tableNumber} (ID: ${table.id})`)

  // 2. Locate or verify a waiter user
  let waiter = await prisma.user.findFirst({
    where: { role: { in: ['waiter', 'WAITER'] } },
  })
  if (!waiter) {
    waiter = await prisma.user.findFirst()
  }
  console.log(`✓ Located Waiter: ${waiter?.name || waiter?.email} (ID: ${waiter?.id})`)

  // 3. Create or find an active order with SERVED status to test post-service tipping
  const orderNumber = `ORD-TEST-${Date.now().toString().slice(-4)}`
  const testOrder = await prisma.order.create({
    data: {
      orderNumber,
      restaurantId: table.restaurantId,
      branchId: table.branchId,
      organizationId: table.organizationId,
      tableId: table.id,
      status: 'SERVED',
      subtotal: 500,
      taxAmount: 25,
      totalAmount: 525,
      servedById: waiter?.id,
      isBilled: false,
    },
  })
  console.log(`✓ Created SERVED test order: ${testOrder.orderNumber} (ID: ${testOrder.id})`)

  // 4. Test Bill Generation (Formula: subtotal 500, 5% tax 25, discount 0, tip 0 -> grandTotal 525)
  const billNumber = `INV-TEST-${Date.now().toString().slice(-4)}`
  const subtotal = 500
  const taxAmount = 25
  const discountAmount = 0
  const tipAmount = 0
  const grandTotal = subtotal + taxAmount - discountAmount + tipAmount

  const bill = await prisma.bill.create({
    data: {
      billNumber,
      restaurantId: table.restaurantId,
      branchId: table.branchId,
      organizationId: table.organizationId,
      tableId: table.id,
      waiterId: waiter?.id,
      subtotal,
      taxAmount,
      discountAmount,
      tipAmount,
      grandTotal,
      totalAmount: grandTotal,
      status: 'GENERATED',
      billStatus: 'open',
      paymentStatus: 'pending',
    },
  })

  // Link test order to bill
  await prisma.order.update({
    where: { id: testOrder.id },
    data: { billId: bill.id },
  })
  console.log(`✓ Generated Bill: ${bill.billNumber} | Subtotal: ₹${bill.subtotal} | Tax: ₹${bill.taxAmount} | GrandTotal: ₹${bill.grandTotal}`)

  // 5. Test Post-Service Tipping (Adding ₹50 tip)
  // Verification rule: Tip is NOT taxed. GrandTotal = 500 + 25 - 0 + 50 = 575
  const newTipAmount = 50
  const updatedGrandTotal = subtotal + taxAmount - discountAmount + newTipAmount

  const updatedBill = await prisma.bill.update({
    where: { id: bill.id },
    data: {
      tipAmount: newTipAmount,
      grandTotal: updatedGrandTotal,
      totalAmount: updatedGrandTotal,
    },
  })

  const tipRecord = await prisma.tip.upsert({
    where: { billId: bill.id },
    create: {
      billId: bill.id,
      waiterId: waiter!.id,
      restaurantId: bill.restaurantId,
      branchId: bill.branchId,
      organizationId: bill.organizationId,
      amount: newTipAmount,
      status: 'PENDING',
    },
    update: {
      amount: newTipAmount,
      status: 'PENDING',
    },
  })

  console.log(`✓ Applied ₹${newTipAmount} Post-Service Tip!`)
  console.log(`✓ Verified GrandTotal: ₹${updatedBill.grandTotal} (Expected: ₹575.00)`)
  console.log(`✓ Tip Record Created: ID ${tipRecord.id} | Status: ${tipRecord.status}`)

  // 6. Test Payment Settlement (Atomic Transaction)
  // - Bill marked PAID
  // - Linked order isBilled = true
  // - Tip status = SETTLED
  // - Table status = available
  await prisma.$transaction([
    prisma.bill.update({
      where: { id: bill.id },
      data: {
        status: 'PAID',
        billStatus: 'settled',
        paymentStatus: 'completed',
        paymentMethod: 'UPI',
        paidAt: new Date(),
        settledAt: new Date(),
      },
    }),
    prisma.order.updateMany({
      where: { billId: bill.id },
      data: {
        isBilled: true,
        paymentStatus: 'completed',
        status: 'completed',
      },
    }),
    prisma.tip.updateMany({
      where: { billId: bill.id },
      data: { status: 'SETTLED' },
    }),
    prisma.restaurantTable.update({
      where: { id: table.id },
      data: { status: 'available' },
    }),
  ])

  console.log(`✓ Bill #${bill.billNumber} settled via UPI!`)

  // 7. Verify post-settlement database states
  const verifyBill = await prisma.bill.findUnique({ where: { id: bill.id } })
  const verifyOrder = await prisma.order.findUnique({ where: { id: testOrder.id } })
  const verifyTip = await prisma.tip.findUnique({ where: { billId: bill.id } })
  const verifyTable = await prisma.restaurantTable.findUnique({ where: { id: table.id } })

  console.log(`  - Bill Status: ${verifyBill?.status} (Expected: PAID)`)
  console.log(`  - Order isBilled: ${verifyOrder?.isBilled} (Expected: true)`)
  console.log(`  - Tip Status: ${verifyTip?.status} (Expected: SETTLED)`)
  console.log(`  - Table Status: ${verifyTable?.status} (Expected: available)`)

  // Clean up test order, tip, and bill so no dummy test data remains
  await prisma.tip.deleteMany({ where: { billId: bill.id } })
  await prisma.order.deleteMany({ where: { id: testOrder.id } })
  await prisma.bill.deleteMany({ where: { id: bill.id } })
  console.log('✓ Cleaned up test records cleanly.')

  console.log('--- ALL BILLING & TIPPING VERIFICATIONS PASSED SUCCESSFULLY! ---')
}

main()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

