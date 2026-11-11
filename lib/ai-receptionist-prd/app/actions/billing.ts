'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { subscription, company, invoice } from '@/lib/db/schema'
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

export async function createSubscription(data: {
  companyId: string
  planName: string
  tier: 'starter' | 'professional' | 'enterprise'
  monthlyPrice: number
  status: 'active' | 'inactive' | 'cancelled'
  startDate: Date
  renewalDate: Date
  maxReceptionists: number
  maxContacts: number
  callMinutesPerMonth: number
}) {
  await verifyCompanyAccess(data.companyId)

  const newSubscription = await db
    .insert(subscription)
    .values({
      id: `sub_${Date.now()}`,
      companyId: data.companyId,
      planName: data.planName,
      tier: data.tier,
      monthlyPrice: data.monthlyPrice,
      status: data.status,
      startDate: data.startDate,
      renewalDate: data.renewalDate,
      maxReceptionists: data.maxReceptionists,
      maxContacts: data.maxContacts,
      callMinutesPerMonth: data.callMinutesPerMonth,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  revalidatePath('/dashboard')
  return newSubscription[0]
}

export async function getSubscriptionByCompany(companyId: string) {
  await verifyCompanyAccess(companyId)

  const subs = await db
    .select()
    .from(subscription)
    .where(eq(subscription.companyId, companyId))

  return subs.length ? subs[0] : null
}

export async function updateSubscription(
  subscriptionId: string,
  data: Partial<{
    tier: string
    monthlyPrice: number
    status: string
    renewalDate: Date
    maxReceptionists: number
    maxContacts: number
    callMinutesPerMonth: number
  }>
) {
  const existing = await db
    .select()
    .from(subscription)
    .where(eq(subscription.id, subscriptionId))

  if (!existing.length) {
    throw new Error('Subscription not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  const updated = await db
    .update(subscription)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(subscription.id, subscriptionId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function createInvoice(data: {
  subscriptionId: string
  companyId: string
  amount: number
  status: 'draft' | 'issued' | 'paid' | 'overdue'
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  lineItems: Array<{
    description: string
    quantity: number
    unitPrice: number
  }>
}) {
  await verifyCompanyAccess(data.companyId)

  const newInvoice = await db
    .insert(invoice)
    .values({
      id: `inv_${Date.now()}`,
      subscriptionId: data.subscriptionId,
      companyId: data.companyId,
      amount: data.amount,
      status: data.status,
      invoiceNumber: data.invoiceNumber,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      lineItems: data.lineItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  revalidatePath('/dashboard')
  return newInvoice[0]
}

export async function getInvoicesByCompany(companyId: string) {
  await verifyCompanyAccess(companyId)

  return db
    .select()
    .from(invoice)
    .where(eq(invoice.companyId, companyId))
    .orderBy((t) => t.issueDate)
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'draft' | 'issued' | 'paid' | 'overdue'
) {
  const existing = await db.select().from(invoice).where(eq(invoice.id, invoiceId))

  if (!existing.length) {
    throw new Error('Invoice not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  const updated = await db
    .update(invoice)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(invoice.id, invoiceId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function getBillingStats(companyId: string) {
  await verifyCompanyAccess(companyId)

  const subscription = await getSubscriptionByCompany(companyId)
  const invoices = await getInvoicesByCompany(companyId)

  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0)
  const outstandingBalance = invoices
    .filter((inv) => inv.status === 'issued' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0)
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length
  const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue').length

  return {
    currentPlan: subscription?.planName || 'None',
    monthlyPrice: subscription?.monthlyPrice || 0,
    subscriptionStatus: subscription?.status || 'inactive',
    totalRevenue,
    outstandingBalance,
    paidInvoices,
    overdueInvoices,
    totalInvoices: invoices.length,
  }
}
