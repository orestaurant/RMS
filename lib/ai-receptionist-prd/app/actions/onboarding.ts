'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function completeOnboarding(data: {
  companyName: string
  industry?: string
  firstName?: string
  lastName?: string
}) {
  const userId = await getUserId()

  // Update user metadata in the user table
  // For now we'll just acknowledge the onboarding completion
  // In a full implementation, you might store this in a user_profile table

  return { success: true, userId }
}

export async function skipOnboarding() {
  const userId = await getUserId()
  return { success: true, userId }
}
