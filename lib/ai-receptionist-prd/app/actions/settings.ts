'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { company, user } from '@/lib/db/schema'
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
  const comp = await db.select().from(company).where(eq(company.id, companyId)).limit(1)

  if (!comp.length || comp[0].userId !== userId) {
    throw new Error('Access denied')
  }
}

export async function updateCompanySettings(
  companyId: string,
  data: {
    name?: string
    industry?: string
    website?: string
    phoneNumber?: string
  }
) {
  await verifyCompanyAccess(companyId)

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

export async function updateUserProfile(data: { name?: string; image?: string }) {
  const userId = await getUserId()

  const updated = await db
    .update(user)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function deleteCompany(companyId: string) {
  await verifyCompanyAccess(companyId)

  await db.delete(company).where(eq(company.id, companyId))
  revalidatePath('/dashboard')
}

export async function getCompanySettings(companyId: string) {
  await verifyCompanyAccess(companyId)

  const comp = await db.select().from(company).where(eq(company.id, companyId)).limit(1)

  if (!comp.length) {
    throw new Error('Company not found')
  }

  return comp[0]
}
