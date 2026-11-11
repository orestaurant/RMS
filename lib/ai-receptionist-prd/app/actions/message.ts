'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { message, company } from '@/lib/db/schema'
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

export async function sendMessage(data: {
  companyId: string
  contactId?: string
  recipientPhoneNumber?: string
  messageType: 'sms' | 'email' | 'internal'
  subject?: string
  content: string
  attachments?: string[]
}) {
  await verifyCompanyAccess(data.companyId)

  const newMessage = await db
    .insert(message)
    .values({
      id: `msg_${Date.now()}`,
      companyId: data.companyId,
      contactId: data.contactId,
      recipientPhoneNumber: data.recipientPhoneNumber,
      messageType: data.messageType,
      subject: data.subject,
      content: data.content,
      attachments: data.attachments || [],
      status: 'sent',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  revalidatePath('/dashboard')
  return newMessage[0]
}

export async function getMessagesByCompany(companyId: string) {
  await verifyCompanyAccess(companyId)

  return db
    .select()
    .from(message)
    .where(eq(message.companyId, companyId))
    .orderBy((t) => t.createdAt)
}

export async function getMessagesByContact(
  companyId: string,
  contactId: string
) {
  await verifyCompanyAccess(companyId)

  return db
    .select()
    .from(message)
    .where(eq(message.contactId, contactId))
}

export async function getMessageById(messageId: string) {
  const result = await db.select().from(message).where(eq(message.id, messageId))

  if (!result.length) {
    throw new Error('Message not found')
  }

  await verifyCompanyAccess(result[0].companyId)
  return result[0]
}

export async function updateMessageStatus(
  messageId: string,
  status: 'sent' | 'delivered' | 'read' | 'failed'
) {
  const existing = await db.select().from(message).where(eq(message.id, messageId))

  if (!existing.length) {
    throw new Error('Message not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  const updated = await db
    .update(message)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(message.id, messageId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function deleteMessage(messageId: string) {
  const existing = await db.select().from(message).where(eq(message.id, messageId))

  if (!existing.length) {
    throw new Error('Message not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  await db.delete(message).where(eq(message.id, messageId))
  revalidatePath('/dashboard')
}

export async function getConversationStats(companyId: string) {
  await verifyCompanyAccess(companyId)

  const messages = await db
    .select()
    .from(message)
    .where(eq(message.companyId, companyId))

  const totalMessages = messages.length
  const sentMessages = messages.filter((m) => m.status === 'sent' || m.status === 'delivered').length
  const smsMessages = messages.filter((m) => m.messageType === 'sms').length
  const emailMessages = messages.filter((m) => m.messageType === 'email').length

  return {
    totalMessages,
    sentMessages,
    smsMessages,
    emailMessages,
  }
}
