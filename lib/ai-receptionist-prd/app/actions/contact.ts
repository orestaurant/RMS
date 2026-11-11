'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { contact, company, deal } from '@/lib/db/schema'
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

export async function createContact(data: {
  companyId: string
  firstName: string
  lastName?: string
  email?: string
  phoneNumber?: string
  company?: string
  title?: string
  source?: string
  notes?: string
}) {
  await verifyCompanyAccess(data.companyId)

  const newContact = await db
    .insert(contact)
    .values({
      id: `contact_${Date.now()}`,
      companyId: data.companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      company: data.company,
      title: data.title,
      source: data.source,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  revalidatePath('/dashboard')
  return newContact[0]
}

export async function getContactsByCompany(companyId: string) {
  await verifyCompanyAccess(companyId)

  return db.select().from(contact).where(eq(contact.companyId, companyId))
}

export async function getContactById(contactId: string) {
  const result = await db.select().from(contact).where(eq(contact.id, contactId))

  if (!result.length) {
    throw new Error('Contact not found')
  }

  await verifyCompanyAccess(result[0].companyId)
  return result[0]
}

export async function updateContact(
  contactId: string,
  data: Partial<typeof contact.$inferInsert>
) {
  const existing = await db.select().from(contact).where(eq(contact.id, contactId))

  if (!existing.length) {
    throw new Error('Contact not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  const updated = await db
    .update(contact)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(contact.id, contactId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function deleteContact(contactId: string) {
  const existing = await db.select().from(contact).where(eq(contact.id, contactId))

  if (!existing.length) {
    throw new Error('Contact not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  await db.delete(contact).where(eq(contact.id, contactId))
  revalidatePath('/dashboard')
}
