'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { call, company } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
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

export async function createCallRecord(data: {
  companyId: string
  receptionistId?: string
  contactId?: string
  phoneNumber: string
  status: 'pending' | 'ringing' | 'active' | 'completed' | 'failed' | 'missed'
  duration?: number
  callNotes?: string
}) {
  await verifyCompanyAccess(data.companyId)

  const newCall = await db
    .insert(call)
    .values({
      id: `call_${Date.now()}`,
      companyId: data.companyId,
      receptionistId: data.receptionistId,
      contactId: data.contactId,
      phoneNumber: data.phoneNumber,
      status: data.status,
      duration: data.duration,
      callNotes: data.callNotes,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  revalidatePath('/dashboard')
  return newCall[0]
}

export async function getCallRecordsByCompany(
  companyId: string,
  limit = 50,
  offset = 0
) {
  await verifyCompanyAccess(companyId)

  return db
    .select()
    .from(call)
    .where(eq(call.companyId, companyId))
    .orderBy((t) => t.createdAt)
    .limit(limit)
    .offset(offset)
}

export async function getCallRecordById(callId: string) {
  const result = await db.select().from(call).where(eq(call.id, callId))

  if (!result.length) {
    throw new Error('Call record not found')
  }

  await verifyCompanyAccess(result[0].companyId)
  return result[0]
}

export async function updateCallRecord(
  callId: string,
  data: Partial<{
    status: string
    duration: number
    recordingUrl: string
    transcription: string
    sentiment: string
    callNotes: string
  }>
) {
  const existing = await db.select().from(call).where(eq(call.id, callId))

  if (!existing.length) {
    throw new Error('Call record not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  const updated = await db
    .update(call)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(call.id, callId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function deleteCallRecord(callId: string) {
  const existing = await db.select().from(call).where(eq(call.id, callId))

  if (!existing.length) {
    throw new Error('Call record not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  await db.delete(call).where(eq(call.id, callId))
  revalidatePath('/dashboard')
}

export async function getCallStats(companyId: string) {
  await verifyCompanyAccess(companyId)

  const calls = await db
    .select()
    .from(call)
    .where(eq(call.companyId, companyId))

  const totalCalls = calls.length
  const completedCalls = calls.filter((c) => c.status === 'completed').length
  const missedCalls = calls.filter((c) => c.status === 'missed').length
  const failedCalls = calls.filter((c) => c.status === 'failed').length
  const averageDuration =
    calls.filter((c) => c.duration).reduce((sum, c) => sum + (c.duration || 0), 0) /
    Math.max(calls.filter((c) => c.duration).length, 1)

  return {
    totalCalls,
    completedCalls,
    missedCalls,
    failedCalls,
    averageDuration: Math.round(averageDuration),
    successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
  }
}
