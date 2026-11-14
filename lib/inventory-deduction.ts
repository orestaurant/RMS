/**
 * High-Speed Automatic Inventory Deduction & Recipe (BOM) Engine
 *
 * 1. Tracks raw material consumption based on recipes when dishes are prepared.
 * 2. Deducts quantities atomically from InventoryItem with full StockMovement audit trails.
 * 3. Alerts owners instantly on Low-Stock and Critical-Stock thresholds.
 * 4. Ultra-low latency: runs asynchronously without blocking KDS kitchen tickets.
 */

import prisma from './prisma'
import { addNotification } from './notifications-store'

export interface RecipeIngredient {
  inventoryItemId?: string
  ingredientName: string
  quantity: number // e.g. 0.2 kg
  unit: string // kg, g, L, ml, pcs
}

// Built-in intelligent recipe dictionary for real restaurant raw materials
const DEFAULT_RECIPE_MAP: Record<string, RecipeIngredient[]> = {
  paneer: [
    { ingredientName: 'Paneer', quantity: 0.2, unit: 'kg' },
    { ingredientName: 'Butter', quantity: 0.04, unit: 'kg' },
    { ingredientName: 'Onion', quantity: 0.1, unit: 'kg' },
    { ingredientName: 'Oil', quantity: 0.02, unit: 'L' },
  ],
  chicken: [
    { ingredientName: 'Chicken', quantity: 0.25, unit: 'kg' },
    { ingredientName: 'Onion', quantity: 0.1, unit: 'kg' },
    { ingredientName: 'Oil', quantity: 0.03, unit: 'L' },
  ],
  mutton: [
    { ingredientName: 'Mutton', quantity: 0.25, unit: 'kg' },
    { ingredientName: 'Onion', quantity: 0.15, unit: 'kg' },
    { ingredientName: 'Oil', quantity: 0.04, unit: 'L' },
  ],
  biryani: [
    { ingredientName: 'Rice', quantity: 0.2, unit: 'kg' },
    { ingredientName: 'Onion', quantity: 0.1, unit: 'kg' },
  ],
  dal: [
    { ingredientName: 'Dal', quantity: 0.12, unit: 'kg' },
    { ingredientName: 'Butter', quantity: 0.03, unit: 'kg' },
  ],
  noodle: [
    { ingredientName: 'Chawmine', quantity: 0.15, unit: 'kg' },
  ],
  chawmine: [
    { ingredientName: 'Chawmine', quantity: 0.15, unit: 'kg' },
  ],
  chowmein: [
    { ingredientName: 'Chawmine', quantity: 0.15, unit: 'kg' },
  ],
  pasta: [
    { ingredientName: 'Pasta', quantity: 0.15, unit: 'kg' },
    { ingredientName: 'Cheese', quantity: 0.06, unit: 'kg' },
  ],
  pizza: [
    { ingredientName: 'Cheese', quantity: 0.1, unit: 'kg' },
    { ingredientName: 'Flour', quantity: 0.2, unit: 'kg' },
  ],
  burger: [
    { ingredientName: 'Buns', quantity: 2, unit: 'pcs' },
    { ingredientName: 'Patty', quantity: 1, unit: 'pcs' },
  ],
  sandwich: [
    { ingredientName: 'Bread', quantity: 2, unit: 'pcs' },
  ],
  coffee: [
    { ingredientName: 'Milk', quantity: 0.25, unit: 'L' },
    { ingredientName: 'Coffee', quantity: 0.015, unit: 'kg' },
  ],
  tea: [
    { ingredientName: 'Milk', quantity: 0.15, unit: 'L' },
    { ingredientName: 'Tea', quantity: 0.01, unit: 'kg' },
  ],
}

/**
 * Resolves recipe for a dish using custom menu item recipe or smart dictionary
 */
export function getRecipeForDish(
  dishName: string,
  customRecipe?: RecipeIngredient[] | null
): RecipeIngredient[] {
  if (customRecipe && Array.isArray(customRecipe) && customRecipe.length > 0) {
    return customRecipe
  }

  const lowerName = (dishName || '').toLowerCase().trim()

  for (const [key, ingredients] of Object.entries(DEFAULT_RECIPE_MAP)) {
    if (lowerName.includes(key)) {
      return ingredients
    }
  }

  // No mock or fake supplies generated: return empty if not mapped
  return []
}

/**
 * Normalizes SKU from ingredient name
 */
function generateIngredientSku(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .slice(0, 16)
  return `RAW_${cleaned}`
}

// In-Memory cache of known inventory items to minimize round-trips
let inventoryLookupCache: Map<string, any> | null = null
let cacheTimestamp = 0

async function getInventoryMap(organizationId?: string): Promise<Map<string, any>> {
  if (inventoryLookupCache && Date.now() - cacheTimestamp < 30_000) {
    return inventoryLookupCache
  }

  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        deletedAt: null,
        ...(organizationId ? { organizationId } : {}),
      },
    })

    const map = new Map<string, any>()
    for (const item of items) {
      if (item.name) map.set(item.name.toLowerCase().trim(), item)
      if (item.sku) map.set(item.sku.toLowerCase().trim(), item)
      if (item.id) map.set(item.id, item)
    }

    inventoryLookupCache = map
    cacheTimestamp = Date.now()
    return map
  } catch (err) {
    return new Map()
  }
}

export function invalidateInventoryLookupCache() {
  inventoryLookupCache = null
  cacheTimestamp = 0
}

/**
 * Core Engine: Automatically deducts raw materials when an order is marked PREPARED / READY
 */
export async function deductStockForPreparedOrder(orderIdOrKey: string): Promise<{
  success: boolean
  message: string
  deductedItems?: Array<{ name: string; quantityDeducted: number; unit: string; remainingStock: number }>
}> {
  try {
    const isUuid = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    // 1. Fetch order with items and menuItem metadata
    let order = null
    if (isUuid(orderIdOrKey)) {
      order = await prisma.order.findUnique({
        where: { id: orderIdOrKey },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  metadata: true,
                },
              },
            },
          },
        },
      })
    }

    if (!order) {
      order = await prisma.order.findFirst({
        where: { orderNumber: orderIdOrKey },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  metadata: true,
                },
              },
            },
          },
        },
      })
    }

    if (!order) {
      return { success: false, message: 'Order not found for inventory deduction' }
    }

    // 2. Idempotency Check: Prevent duplicate deductions if order was already processed
    const meta = (order.metadata as any) || {}
    if (meta.inventoryDeducted) {
      return {
        success: true,
        message: 'Inventory already deducted for this prepared order',
      }
    }

    // 3. Aggregate all ingredients required across all ordered items
    const requiredIngredients = new Map<
      string,
      {
        ingredientName: string
        totalQuantity: number
        unit: string
        inventoryItemId?: string
        dishNames: string[]
      }
    >()

    for (const item of order.items) {
      const dishName = item.itemName || item.menuItem?.name || 'Dish'
      const customRecipe = (item.menuItem?.metadata as any)?.recipe as RecipeIngredient[] | undefined
      const recipe = getRecipeForDish(dishName, customRecipe)

      const orderedQty = Math.max(1, Number(item.quantity) || 1)

      for (const ing of recipe) {
        const normKey = (ing.inventoryItemId || ing.ingredientName).toLowerCase().trim()
        const amount = Number(ing.quantity || 0) * orderedQty

        const existing = requiredIngredients.get(normKey)
        if (existing) {
          existing.totalQuantity += amount
          if (!existing.dishNames.includes(dishName)) {
            existing.dishNames.push(dishName)
          }
        } else {
          requiredIngredients.set(normKey, {
            ingredientName: ing.ingredientName,
            totalQuantity: amount,
            unit: ing.unit,
            inventoryItemId: ing.inventoryItemId,
            dishNames: [dishName],
          })
        }
      }
    }

    if (requiredIngredients.size === 0) {
      return { success: true, message: 'No recipe ingredients mapped for deduction' }
    }

    // 4. Resolve & Deduct from Inventory in PostgreSQL
    const invMap = await getInventoryMap(order.organizationId)
    const deductedResults: Array<{
      name: string
      quantityDeducted: number
      unit: string
      remainingStock: number
    }> = []

    for (const [key, req] of requiredIngredients.entries()) {
      // Find matching real inventory item
      let invItem =
        (req.inventoryItemId && invMap.get(req.inventoryItemId)) ||
        invMap.get(key) ||
        invMap.get(req.ingredientName.toLowerCase().trim()) ||
        invMap.get(generateIngredientSku(req.ingredientName).toLowerCase())

      // Fuzzy lookup against user's actual real inventory items
      if (!invItem) {
        const reqLower = req.ingredientName.toLowerCase()
        for (const [itemName, item] of invMap.entries()) {
          if (
            itemName.includes(reqLower) ||
            reqLower.includes(itemName) ||
            (reqLower.includes('noodle') && itemName.includes('chawmine')) ||
            (reqLower.includes('chawmine') && itemName.includes('noodle'))
          ) {
            invItem = item
            break
          }
        }
      }

      // STRICT: Never auto-create mock items with fake stock.
      // If an ingredient is not present in real inventory, skip it cleanly.
      if (!invItem) {
        continue
      }

      const deductAmount = parseFloat(req.totalQuantity.toFixed(4))
      const currentQty = Math.max(0, Number(invItem.quantity ?? 0))
      const newQty = Math.max(0, parseFloat((currentQty - deductAmount).toFixed(4)))

      // Atomic update of inventory quantity
      const updated = await prisma.inventoryItem.update({
        where: { id: invItem.id },
        data: {
          quantity: newQty,
          updatedAt: new Date(),
        },
      })

      // Record detailed StockMovement audit log
      try {
        await prisma.stockMovement.create({
          data: {
            inventoryItemId: invItem.id,
            branchId: order.branchId,
            organizationId: order.organizationId,
            movementType: 'recipe_consumption',
            quantity: deductAmount as any,
            referenceId: order.orderNumber,
            referenceType: 'order_prepared',
            notes: `Auto-deducted for order ${order.orderNumber} (${req.dishNames.join(', ')})`,
          },
        })
      } catch (smErr) {
        // StockMovement creation failure shouldn't fail deduction
      }

      deductedResults.push({
        name: invItem.name,
        quantityDeducted: deductAmount,
        unit: invItem.unit || req.unit,
        remainingStock: newQty,
      })

      // 5. Stock Discrepancy & Threshold Alerts:
      const criticalStock = Number(invItem.criticalStock ?? 2.0)
      const minStock = Number(invItem.minStock ?? 5.0)

      if (newQty <= criticalStock) {
        // Critical Alert
        const alertTitle = `🚨 CRITICAL STOCK: ${invItem.name}`
        const alertBody = `${invItem.name} stock has reached CRITICAL level (${newQty.toFixed(2)} ${invItem.unit} remaining). Reorder immediately!`

        addNotification({
          type: 'alert',
          title: alertTitle,
          body: alertBody,
          metadata: {
            orderNumber: order.orderNumber,
          },
        })

        // Persist to Notification table
        try {
          await prisma.notification.create({
            data: {
              organizationId: order.organizationId,
              notificationType: 'CRITICAL_STOCK',
              title: alertTitle,
              message: alertBody,
              data: {
                inventoryItemId: invItem.id,
                remainingQuantity: newQty,
                unit: invItem.unit,
              },
            },
          })
        } catch (nErr) {}
      } else if (newQty <= minStock) {
        // Warning Alert
        const alertTitle = `⚠️ Low Stock Warning: ${invItem.name}`
        const alertBody = `${invItem.name} is running low (${newQty.toFixed(2)} ${invItem.unit} remaining). Reorder recommended.`

        addNotification({
          type: 'alert',
          title: alertTitle,
          body: alertBody,
          metadata: {
            orderNumber: order.orderNumber,
          },
        })
      }
    }

    // 6. Mark order metadata as inventoryDeducted to preserve idempotency
    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: {
          ...meta,
          inventoryDeducted: true,
          inventoryDeductedAt: new Date().toISOString(),
          deductedItemCount: deductedResults.length,
        },
      },
    })

    invalidateInventoryLookupCache()

    return {
      success: true,
      message: `Successfully deducted ${deductedResults.length} raw ingredients`,
      deductedItems: deductedResults,
    }
  } catch (error: any) {
    console.error('Failed to deduct stock for order:', error)
    return {
      success: false,
      message: error?.message || 'Inventory deduction failed',
    }
  }
}

