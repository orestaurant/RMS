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

async function verifyCompanyAccess(companyId: string) {
  const userId = await getUserId()
  const result = await db.select().from(company).where(eq(company.id, companyId))

  if (!result.length || result[0].userId !== userId) {
    throw new Error('Unauthorized')
  }
}

export async function updateCompanySettings(
  companyId: string,
  data: Partial<{
    name: string
    industry: string
    phone: string
    email: string
    address: string
    timezone: string
    language: string
  }>
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

export async function getIntegrations(companyId: string) {
  await verifyCompanyAccess(companyId)

  // In a real app, these would be stored in a database
  return {
    calendar: {
      name: 'Calendar Integration',
      provider: 'Google Calendar',
      connected: false,
      icon: '📅',
    },
    crm: {
      name: 'CRM Integration',
      provider: 'Salesforce',
      connected: false,
      icon: '🤝',
    },
    slack: {
      name: 'Slack Integration',
      provider: 'Slack',
      connected: false,
      icon: '💬',
    },
    zapier: {
      name: 'Zapier Integration',
      provider: 'Zapier',
      connected: false,
      icon: '⚡',
    },
    twilio: {
      name: 'Twilio Integration',
      provider: 'Twilio',
      connected: false,
      icon: '📞',
    },
    stripe: {
      name: 'Stripe Payments',
      provider: 'Stripe',
      connected: false,
      icon: '💳',
    },
  }
}

export async function connectIntegration(companyId: string, integrationId: string) {
  await verifyCompanyAccess(companyId)

  // In a real app, this would handle OAuth flow or API key storage
  console.log(`[v0] Connecting ${integrationId} integration for company ${companyId}`)

  // Return a mock response
  return {
    success: true,
    message: `${integrationId} integration connected successfully`,
  }
}

export async function disconnectIntegration(companyId: string, integrationId: string) {
  await verifyCompanyAccess(companyId)

  console.log(`[v0] Disconnecting ${integrationId} integration for company ${companyId}`)

  return {
    success: true,
    message: `${integrationId} integration disconnected`,
  }
}

export async function getAPIKeys(companyId: string) {
  await verifyCompanyAccess(companyId)

  // In a real app, these would be stored securely
  return [
    {
      id: 'key_1',
      name: 'Production API Key',
      key: 'callai_prod_*****',
      createdAt: new Date(),
      lastUsed: new Date(),
    },
    {
      id: 'key_2',
      name: 'Development API Key',
      key: 'callai_dev_*****',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ]
}

export async function createAPIKey(companyId: string, name: string) {
  await verifyCompanyAccess(companyId)

  const newKey = {
    id: `key_${Date.now()}`,
    name,
    key: `callai_${Math.random().toString(36).substring(2, 15)}`,
    createdAt: new Date(),
    lastUsed: new Date(),
  }

  return newKey
}

export async function deleteAPIKey(companyId: string, keyId: string) {
  await verifyCompanyAccess(companyId)

  return {
    success: true,
    message: 'API key deleted',
  }
}
