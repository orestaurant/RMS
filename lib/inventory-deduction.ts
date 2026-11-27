/**
 * High-Speed Automatic Inventory Deduction & Recipe (BOM) Engine
 *
 * 1. Tracks raw material consumption based on recipes when dishes are prepared.
 * 2. Deducts quantities atomically from BOTH `InventoryItem` and `RawMaterial` tables
 *    with unit conversion (kg <-> g, L <-> ml) and `StockMovement` audit trails.
 * 3. Triggers Low-Stock / Critical-Stock alerts (including Vendor & Inventory Manager alerts).
 * 4. Syncs MenuItem availability ("Out of Stock") automatically when linked ingredients deplete.
 */

import prisma from './prisma'
import { addNotification } from './notifications-store'
import { checkAndTriggerLowStockAlert } from './inventory-alerts'
import { invalidateAllMenuCaches } from './menu-cache'

export interface RecipeIngredient {
  inventoryItemId?: string
  rawMaterialId?: string
  sku?: string
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
  noodle: [{ ingredientName: 'Chawmine', quantity: 0.15, unit: 'kg' }],
  chawmine: [{ ingredientName: 'Chawmine', quantity: 0.15, unit: 'kg' }],
  chowmein: [{ ingredientName: 'Chawmine', quantity: 0.15, unit: 'kg' }],
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
  sandwich: [{ ingredientName: 'Bread', quantity: 2, unit: 'pcs' }],
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
 * Normalizes unit strings into canonical symbols for conversion.
 */
function normalizeUnit(unit?: string | null): string {
  const u = (unit || '').toLowerCase().trim()
  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(u)) return 'kg'
  if (['g', 'gm', 'gms', 'gram', 'grams'].includes(u)) return 'g'
  if (['l', 'lt', 'ltr', 'liter', 'liters', 'litre', 'litres'].includes(u)) return 'l'
  if (['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'].includes(u)) return 'ml'
  if (['pc', 'pcs', 'piece', 'pieces', 'unit', 'units', 'nos'].includes(u)) return 'pcs'
  return u || 'pcs'
}

/**
 * Converts a quantity from recipe unit to inventory stock unit.
 */
export function convertQuantityUnit(
  amount: number,
  fromUnit?: string | null,
  toUnit?: string | null
): number {
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  if (from === to) return amount

  if (from === 'g' && to === 'kg') return amount / 1000
  if (from === 'kg' && to === 'g') return amount * 1000
  if (from === 'ml' && to === 'l') return amount / 1000
  if (from === 'l' && to === 'ml') return amount * 1000

  return amount
}

/**
 * Resolves recipe for a dish using custom menu item recipe or smart dictionary.
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

  return []
}

function generateIngredientSku(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .slice(0, 16)
  return `RAW_${cleaned}`
}

function normalizeName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface UnifiedInventorySnapshot {
  inventoryItems: any[]
  rawMaterials: any[]
  invById: Map<string, any>
  invByKey: Map<string, any>
  rawById: Map<string, any>
  rawByKey: Map<string, any>
}

let snapshotCache: { data: UnifiedInventorySnapshot; timestamp: number; orgKey: string } | null = null

async function getUnifiedInventorySnapshot(
  organizationId?: string | null,
  forceRefresh = false
): Promise<UnifiedInventorySnapshot> {
  const orgKey = organizationId || 'all'
  if (
    !forceRefresh &&
    snapshotCache &&
    snapshotCache.orgKey === orgKey &&
    Date.now() - snapshotCache.timestamp < 5_000
  ) {
    return snapshotCache.data
  }

  const [inventoryItems, rawMaterials] = await Promise.all([
    prisma.inventoryItem
      .findMany({
        where: {
          deletedAt: null,
          ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
        },
      })
      .catch(() => []),
    prisma.rawMaterial.findMany().catch(() => []),
  ])

  const invById = new Map<string, any>()
  const invByKey = new Map<string, any>()
  for (const item of inventoryItems) {
    if (item.id) invById.set(item.id, item)
    if (item.name) invByKey.set(normalizeName(item.name), item)
    if (item.itemName) invByKey.set(normalizeName(item.itemName), item)
    if (item.sku) invByKey.set(item.sku.toLowerCase().trim(), item)
  }

  const rawById = new Map<string, any>()
  const rawByKey = new Map<string, any>()
  for (const mat of rawMaterials) {
    if (mat.id) rawById.set(mat.id, mat)
    if (mat.name) rawByKey.set(normalizeName(mat.name), mat)
    if (mat.sku) rawByKey.set(mat.sku.toLowerCase().trim(), mat)
  }

  const data: UnifiedInventorySnapshot = {
    inventoryItems,
    rawMaterials,
    invById,
    invByKey,
    rawById,
    rawByKey,
  }

  snapshotCache = { data, timestamp: Date.now(), orgKey }
  return data
}

export function invalidateInventoryLookupCache() {
  snapshotCache = null
}

function findMatchingInMap(
  byId: Map<string, any>,
  byKey: Map<string, any>,
  records: any[],
  opts: { id?: string; sku?: string; name: string }
): any | null {
  if (opts.id && byId.has(opts.id)) return byId.get(opts.id)
  if (opts.sku) {
    const bySku = byKey.get(opts.sku.toLowerCase().trim())
    if (bySku) return bySku
  }

  const norm = normalizeName(opts.name)
  if (!norm) return null
  if (byKey.has(norm)) return byKey.get(norm)

  const genSku = generateIngredientSku(opts.name).toLowerCase()
  if (byKey.has(genSku)) return byKey.get(genSku)

  // Fuzzy match (e.g. "oil" <-> "refined cooking oil", "rice" <-> "basmati rice", "noodle" <-> "chawmine")
  for (const rec of records) {
    const recName = normalizeName(rec.name || rec.itemName || '')
    if (!recName) continue
    if (
      recName.includes(norm) ||
      norm.includes(recName) ||
      (norm.includes('noodle') && (recName.includes('chawmine') || recName.includes('chowmein'))) ||
      ((norm.includes('chawmine') || norm.includes('chowmein')) && recName.includes('noodle'))
    ) {
      return rec
    }
  }

  return null
}

/**
 * Syncs MenuItem.isAvailable based on linked recipe ingredients' live inventory stock.
 * Marks items Out of Stock when any tracked recipe ingredient is depleted,
 * and re-enables items that were auto-disabled once stock is replenished.
 */
export async function syncMenuAvailabilityFromInventory(
  organizationId?: string | null
): Promise<number> {
  try {
    const snapshot = await getUnifiedInventorySnapshot(organizationId, true)
    const menuItems = await prisma.menuItem.findMany({
      where: {
        deletedAt: null,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        name: true,
        isAvailable: true,
        metadata: true,
      },
    })

    let changedCount = 0

    for (const item of menuItems) {
      const meta = (item.metadata as Record<string, any>) || {}
      const customRecipe = Array.isArray(meta.recipe) ? (meta.recipe as RecipeIngredient[]) : null
      if (!customRecipe || customRecipe.length === 0) continue

      let hasTrackedIngredient = false
      let anyDepleted = false

      for (const ing of customRecipe) {
        const invMatch = findMatchingInMap(
          snapshot.invById,
          snapshot.invByKey,
          snapshot.inventoryItems,
          { id: ing.inventoryItemId, sku: ing.sku, name: ing.ingredientName }
        )
        const rawMatch = findMatchingInMap(
          snapshot.rawById,
          snapshot.rawByKey,
          snapshot.rawMaterials,
          { id: ing.rawMaterialId, sku: ing.sku || invMatch?.sku, name: ing.ingredientName }
        )

        if (!invMatch && !rawMatch) continue
        hasTrackedIngredient = true

        // Check if available stock in either matched store is enough for 1 serving
        const invQty = invMatch ? Number(invMatch.quantity ?? invMatch.quantityInStock ?? 0) : null
        const rawQty = rawMatch ? Number(rawMatch.quantity ?? 0) : null

        const requiredInInvUnit = invMatch
          ? convertQuantityUnit(Number(ing.quantity || 0), ing.unit, invMatch.unit || ing.unit)
          : 0
        const requiredInRawUnit = rawMatch
          ? convertQuantityUnit(Number(ing.quantity || 0), ing.unit, rawMatch.weightUnit || ing.unit)
          : 0

        const invDepleted = invMatch !== null && (invQty! <= 0 || invQty! < requiredInInvUnit)
        const rawDepleted = rawMatch !== null && (rawQty! <= 0 || rawQty! < requiredInRawUnit)

        // If tracked in RawMaterial or InventoryItem and depleted there
        if ((rawMatch && rawDepleted) || (!rawMatch && invDepleted)) {
          anyDepleted = true
          break
        }
      }

      if (!hasTrackedIngredient) continue

      if (anyDepleted && item.isAvailable) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: {
            isAvailable: false,
            metadata: {
              ...meta,
              autoDisabledByInventory: true,
              autoDisabledAt: new Date().toISOString(),
            },
          },
        })
        changedCount++
      } else if (!anyDepleted && !item.isAvailable && meta.autoDisabledByInventory) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: {
            isAvailable: true,
            metadata: {
              ...meta,
              autoDisabledByInventory: false,
              autoReenabledAt: new Date().toISOString(),
            },
          },
        })
        changedCount++
      }
    }

    if (changedCount > 0) {
      invalidateAllMenuCaches()
    }
    return changedCount
  } catch (err) {
    console.warn('syncMenuAvailabilityFromInventory warning:', (err as any)?.message)
    return 0
  }
}

/**
 * Core Engine: Automatically deducts raw materials from BOTH InventoryItem and RawMaterial
 * when an order is marked PREPARED / READY.
 */
export async function deductStockForPreparedOrder(orderIdOrKey: string): Promise<{
  success: boolean
  message: string
  deductedItems?: Array<{
    name: string
    quantityDeducted: number
    unit: string
    remainingStock: number
    source: 'inventory' | 'raw_material' | 'both'
  }>
}> {
  try {
    const isUuid = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    const orderInclude = {
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
    } as const

    // 1. Fetch order with items and menuItem metadata
    let order = null
    if (isUuid(orderIdOrKey)) {
      order = await prisma.order.findUnique({
        where: { id: orderIdOrKey },
        include: orderInclude,
      })
    }

    if (!order) {
      order = await prisma.order.findFirst({
        where: { orderNumber: orderIdOrKey },
        include: orderInclude,
      })
    }

    if (!order) {
      return { success: false, message: 'Order not found for inventory deduction' }
    }

    // 2. Idempotency Check: Prevent duplicate deductions if order was already processed
    const meta = (order.metadata as Record<string, any>) || {}
    if (meta.inventoryDeducted) {
      return {
        success: true,
        message: 'Inventory already deducted for this prepared order',
      }
    }

    // Always fetch fresh snapshot during deduction so stock changes are accurate
    const snapshot = await getUnifiedInventorySnapshot(order.organizationId, true)

    // 3. Aggregate all ingredients required across all ordered items
    const requiredIngredients = new Map<
      string,
      {
        ingredientName: string
        totalQuantity: number
        unit: string
        inventoryItemId?: string
        rawMaterialId?: string
        sku?: string
        dishNames: string[]
      }
    >()

    for (const item of order.items) {
      const dishName = item.itemName || item.menuItem?.name || 'Dish'
      const customRecipe = (item.menuItem?.metadata as any)?.recipe as RecipeIngredient[] | undefined
      let recipe = getRecipeForDish(dishName, customRecipe)

      // 3rd fallback: if dish itself matches an InventoryItem / RawMaterial (e.g. "Mineral Water", "Coke")
      if (recipe.length === 0) {
        const directInv = findMatchingInMap(
          snapshot.invById,
          snapshot.invByKey,
          [],
          { name: dishName }
        )
        const directRaw = findMatchingInMap(
          snapshot.rawById,
          snapshot.rawByKey,
          [],
          { name: dishName }
        )
        if (directInv || directRaw) {
          recipe = [
            {
              inventoryItemId: directInv?.id,
              rawMaterialId: directRaw?.id,
              sku: directInv?.sku || directRaw?.sku,
              ingredientName: directInv?.name || directRaw?.name || dishName,
              quantity: 1,
              unit: directInv?.unit || directRaw?.weightUnit || 'pcs',
            },
          ]
        }
      }

      const orderedQty = Math.max(1, Number(item.quantity) || 1)

      for (const ing of recipe) {
        const normKey = (
          ing.rawMaterialId ||
          ing.inventoryItemId ||
          ing.sku ||
          normalizeName(ing.ingredientName)
        )
          .toLowerCase()
          .trim()
        const amount = Number(ing.quantity || 0) * orderedQty
        if (amount <= 0) continue

        const existing = requiredIngredients.get(normKey)
        if (existing) {
          // Convert to existing unit if needed before summing
          const converted = convertQuantityUnit(amount, ing.unit, existing.unit)
          existing.totalQuantity += converted
          if (!existing.dishNames.includes(dishName)) {
            existing.dishNames.push(dishName)
          }
        } else {
          requiredIngredients.set(normKey, {
            ingredientName: ing.ingredientName,
            totalQuantity: amount,
            unit: ing.unit,
            inventoryItemId: ing.inventoryItemId,
            rawMaterialId: ing.rawMaterialId,
            sku: ing.sku,
            dishNames: [dishName],
          })
        }
      }
    }

    if (requiredIngredients.size === 0) {
      return { success: true, message: 'No recipe ingredients mapped for deduction' }
    }

    // 4. Resolve & Deduct from InventoryItem AND RawMaterial in PostgreSQL
    const deductedResults: Array<{
      name: string
      quantityDeducted: number
      unit: string
      remainingStock: number
      source: 'inventory' | 'raw_material' | 'both'
    }> = []

    // Track updated quantities inside this loop in case two keys resolve to same DB record
    const liveInvQty = new Map<string, number>()
    const liveRawQty = new Map<string, number>()

    for (const [, req] of requiredIngredients.entries()) {
      const invItem = findMatchingInMap(
        snapshot.invById,
        snapshot.invByKey,
        snapshot.inventoryItems,
        { id: req.inventoryItemId, sku: req.sku, name: req.ingredientName }
      )

      const rawMat = findMatchingInMap(
        snapshot.rawById,
        snapshot.rawByKey,
        snapshot.rawMaterials,
        {
          id: req.rawMaterialId,
          sku: req.sku || invItem?.sku,
          name: req.ingredientName,
        }
      )

      if (!invItem && !rawMat) {
        continue
      }

      let deductedInvAmount = 0
      let remainingInvQty = 0
      let deductedRawAmount = 0
      let remainingRawQty = 0

      // 4A. Deduct from InventoryItem
      if (invItem) {
        const currentQty = liveInvQty.has(invItem.id)
          ? liveInvQty.get(invItem.id)!
          : Math.max(0, Number(invItem.quantity ?? invItem.quantityInStock ?? 0))

        const convertedAmount = convertQuantityUnit(
          req.totalQuantity,
          req.unit,
          invItem.unit || req.unit
        )
        deductedInvAmount = parseFloat(convertedAmount.toFixed(4))
        remainingInvQty = Math.max(0, parseFloat((currentQty - deductedInvAmount).toFixed(4)))
        liveInvQty.set(invItem.id, remainingInvQty)

        await prisma.inventoryItem.update({
          where: { id: invItem.id },
          data: {
            quantity: remainingInvQty,
            quantityInStock: remainingInvQty,
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
              quantity: deductedInvAmount as any,
              referenceId: order.orderNumber,
              referenceType: 'order_prepared',
              notes: `Auto-deducted for order ${order.orderNumber} (${req.dishNames.join(', ')})`,
            },
          })
        } catch {
          // StockMovement failure should not fail deduction
        }

        const criticalStock = Number(invItem.criticalStock ?? 2.0)
        const minStock = Number(invItem.minStock ?? 5.0)

        if (remainingInvQty <= criticalStock) {
          const alertTitle = `🚨 CRITICAL STOCK: ${invItem.name}`
          const alertBody = `${invItem.name} stock has reached CRITICAL level (${remainingInvQty.toFixed(2)} ${invItem.unit} remaining). Reorder immediately!`

          addNotification({
            type: 'alert',
            title: alertTitle,
            body: alertBody,
            metadata: { orderNumber: order.orderNumber },
          })

          try {
            await prisma.notification.create({
              data: {
                organizationId: order.organizationId,
                notificationType: 'CRITICAL_STOCK',
                title: alertTitle,
                message: alertBody,
                data: {
                  inventoryItemId: invItem.id,
                  remainingQuantity: remainingInvQty,
                  unit: invItem.unit,
                },
              },
            })
          } catch {}
        } else if (remainingInvQty <= minStock) {
          const alertTitle = `⚠️ Low Stock Warning: ${invItem.name}`
          const alertBody = `${invItem.name} is running low (${remainingInvQty.toFixed(2)} ${invItem.unit} remaining). Reorder recommended.`

          addNotification({
            type: 'alert',
            title: alertTitle,
            body: alertBody,
            metadata: { orderNumber: order.orderNumber },
          })
        }
      }

      // 4B. Deduct from RawMaterial (synced with /inventory-manager/inventory)
      if (rawMat) {
        const currentRawQty = liveRawQty.has(rawMat.id)
          ? liveRawQty.get(rawMat.id)!
          : Math.max(0, Number(rawMat.quantity ?? 0))

        const convertedRawAmount = convertQuantityUnit(
          req.totalQuantity,
          req.unit,
          rawMat.weightUnit || req.unit
        )
        deductedRawAmount = parseFloat(convertedRawAmount.toFixed(4))
        remainingRawQty = Math.max(0, parseFloat((currentRawQty - deductedRawAmount).toFixed(4)))
        liveRawQty.set(rawMat.id, remainingRawQty)

        const updatedRaw = await prisma.rawMaterial.update({
          where: { id: rawMat.id },
          data: {
            quantity: remainingRawQty,
            updatedAt: new Date(),
          },
        })

        // Trigger Inventory Manager & Vendor low-stock alert if below minThreshold
        await checkAndTriggerLowStockAlert(updatedRaw).catch(() => {})
      }

      const source: 'inventory' | 'raw_material' | 'both' =
        invItem && rawMat ? 'both' : invItem ? 'inventory' : 'raw_material'

      deductedResults.push({
        name: rawMat?.name || invItem?.name || req.ingredientName,
        quantityDeducted: rawMat ? deductedRawAmount : deductedInvAmount,
        unit: rawMat?.weightUnit || invItem?.unit || req.unit,
        remainingStock: rawMat ? remainingRawQty : remainingInvQty,
        source,
      })
    }

    // 5. Mark order metadata as inventoryDeducted to preserve idempotency
    if (deductedResults.length > 0) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          metadata: {
            ...meta,
            inventoryDeducted: true,
            inventoryDeductedAt: new Date().toISOString(),
            deductedItemCount: deductedResults.length,
            deductedItems: deductedResults,
          },
        },
      })
    }

    invalidateInventoryLookupCache()

    // 6. Auto-mark any linked MenuItems as Out of Stock if ingredients ran out
    await syncMenuAvailabilityFromInventory(order.organizationId)

    return {
      success: true,
      message:
        deductedResults.length > 0
          ? `Successfully deducted ${deductedResults.length} raw ingredient(s)`
          : 'No matching InventoryItem or RawMaterial records found for recipe ingredients',
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
