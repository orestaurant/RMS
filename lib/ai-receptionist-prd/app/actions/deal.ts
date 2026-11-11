'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deal, company } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function verifyCompanyAccess(companyId: string) {
  const userId = await getUserId()
  const result = await db.select().from(company).where(eq(company.id, companyId))

  if (!result.length || result[0].userId !== userId) {
    throw new Error('Unauthorized')
  }
}

export async function createDeal(data: {
  companyId: string
  contactId?: string
  name: string
  value?: number
  currency?: string
  status?: string
  probability?: number
  expectedCloseDate?: Date
  notes?: string
}) {
  await verifyCompanyAccess(data.companyId)

  const newDeal = await db
    .insert(deal)
    .values({
      id: `deal_${Date.now()}`,
      companyId: data.companyId,
      contactId: data.contactId,
      name: data.name,
      value: data.value,
      currency: data.currency || 'USD',
      status: data.status || 'new',
      probability: data.probability || 0,
      expectedCloseDate: data.expectedCloseDate,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  revalidatePath('/dashboard')
  return newDeal[0]
}

export async function getDealsByCompany(companyId: string) {
  await verifyCompanyAccess(companyId)

  return db.select().from(deal).where(eq(deal.companyId, companyId))
}

export async function getDealById(dealId: string) {
  const result = await db.select().from(deal).where(eq(deal.id, dealId))

  if (!result.length) {
    throw new Error('Deal not found')
  }

  await verifyCompanyAccess(result[0].companyId)
  return result[0]
}

export async function updateDeal(
  dealId: string,
  data: Partial<{
    name: string
    value: number
    status: string
    probability: number
    expectedCloseDate: Date
    closedDate: Date
    notes: string
  }>
) {
  const existing = await db.select().from(deal).where(eq(deal.id, dealId))

  if (!existing.length) {
    throw new Error('Deal not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  const updated = await db
    .update(deal)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(deal.id, dealId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function deleteDeal(dealId: string) {
  const existing = await db.select().from(deal).where(eq(deal.id, dealId))

  if (!existing.length) {
    throw new Error('Deal not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  await db.delete(deal).where(eq(deal.id, dealId))
  revalidatePath('/dashboard')
}

export async function getDealStats(companyId: string) {
  await verifyCompanyAccess(companyId)

  const deals = await db.select().from(deal).where(eq(deal.companyId, companyId))

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
  const openDeals = deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.status)).length
  const wonDeals = deals.filter((d) => d.status === 'closed_won').length
  const averageDealValue = deals.length > 0 ? Math.round(totalValue / deals.length) : 0

  return {
    totalDeals: deals.length,
    totalValue,
    openDeals,
    wonDeals,
    averageDealValue,
  }
}
