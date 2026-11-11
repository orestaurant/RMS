'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { company } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function createCompany(data: {
  name: string
  industry?: string
  website?: string
  phoneNumber?: string
}) {
  const userId = await getUserId()
  const newCompany = await db
    .insert(company)
    .values({
      id: `company_${Date.now()}`,
      userId,
      name: data.name,
      industry: data.industry,
      website: data.website,
      phoneNumber: data.phoneNumber,
      plan: 'free',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  revalidatePath('/dashboard')
  return newCompany[0]
}

export async function getCompanies() {
  const userId = await getUserId()
  return db.select().from(company).where(eq(company.userId, userId))
}

export async function getCompanyById(companyId: string) {
  const userId = await getUserId()
  const result = await db
    .select()
    .from(company)
    .where(eq(company.id, companyId))

  if (!result.length || result[0].userId !== userId) {
    throw new Error('Unauthorized')
  }

  return result[0]
}

export async function updateCompany(
  companyId: string,
  data: Partial<typeof company.$inferInsert>
) {
  const userId = await getUserId()
  const existing = await db.select().from(company).where(eq(company.id, companyId))

  if (!existing.length || existing[0].userId !== userId) {
    throw new Error('Unauthorized')
  }

  const updated = await db
    .update(company)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(company.id, companyId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function deleteCompany(companyId: string) {
  const userId = await getUserId()
  const existing = await db.select().from(company).where(eq(company.id, companyId))

  if (!existing.length || existing[0].userId !== userId) {
    throw new Error('Unauthorized')
  }

  await db.delete(company).where(eq(company.id, companyId))
  revalidatePath('/dashboard')
}
