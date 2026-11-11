'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { receptionist, company } from '@/lib/db/schema'
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

export async function createReceptionist(data: {
  companyId: string
  name: string
  language?: string
  systemPrompt?: string
  greetingMessage?: string
  transferNumber?: string
}) {
  await verifyCompanyAccess(data.companyId)

  const newReceptionist = await db
    .insert(receptionist)
    .values({
      id: `receptionist_${Date.now()}`,
      companyId: data.companyId,
      name: data.name,
      language: data.language || 'en',
      systemPrompt: data.systemPrompt,
      greetingMessage: data.greetingMessage,
      transferNumber: data.transferNumber,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  revalidatePath('/dashboard')
  return newReceptionist[0]
}

export async function getReceptionistsByCompany(companyId: string) {
  await verifyCompanyAccess(companyId)
  return db.select().from(receptionist).where(eq(receptionist.companyId, companyId))
}

export async function getReceptionistById(receptionistId: string) {
  const result = await db.select().from(receptionist).where(eq(receptionist.id, receptionistId))

  if (!result.length) {
    throw new Error('Receptionist not found')
  }

  await verifyCompanyAccess(result[0].companyId)
  return result[0]
}

export async function updateReceptionist(
  receptionistId: string,
  data: Partial<typeof receptionist.$inferInsert>
) {
  const existing = await db.select().from(receptionist).where(eq(receptionist.id, receptionistId))

  if (!existing.length) {
    throw new Error('Receptionist not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  const updated = await db
    .update(receptionist)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(receptionist.id, receptionistId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function deleteReceptionist(receptionistId: string) {
  const existing = await db.select().from(receptionist).where(eq(receptionist.id, receptionistId))

  if (!existing.length) {
    throw new Error('Receptionist not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  await db.delete(receptionist).where(eq(receptionist.id, receptionistId))
  revalidatePath('/dashboard')
}
