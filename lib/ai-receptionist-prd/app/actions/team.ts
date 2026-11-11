'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { teamMember, company, user } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function verifyCompanyAccess(companyId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const comp = await db.select().from(company).where(eq(company.id, companyId))
  if (!comp.length || comp[0].userId !== session.user.id) {
    throw new Error('Access denied')
  }
}

export async function inviteTeamMember(
  companyId: string,
  email: string,
  role: 'admin' | 'user' | 'viewer'
) {
  await verifyCompanyAccess(companyId)

  // Find user by email
  const existingUser = await db.select().from(user).where(eq(user.email, email))

  if (!existingUser.length) {
    throw new Error('User not found. Please ask them to sign up first.')
  }

  // Check if already a team member
  const existing = await db
    .select()
    .from(teamMember)
    .where(
      and(
        eq(teamMember.companyId, companyId),
        eq(teamMember.userId, existingUser[0].id)
      )
    )

  if (existing.length) {
    throw new Error('User is already a team member')
  }

  const id = `tm_${Date.now()}`
  await db.insert(teamMember).values({
    id,
    companyId,
    userId: existingUser[0].id,
    role,
    permissions: {
      canManageReceptionists: role !== 'viewer',
      canManageContacts: role !== 'viewer',
      canViewAnalytics: true,
      canManageTeam: role === 'admin',
      canManageBilling: role === 'admin',
    },
  })

  revalidatePath('/dashboard')
}

export async function updateTeamMemberRole(
  companyId: string,
  memberId: string,
  role: 'admin' | 'user' | 'viewer'
) {
  await verifyCompanyAccess(companyId)

  const member = await db.select().from(teamMember).where(eq(teamMember.id, memberId))

  if (!member.length || member[0].companyId !== companyId) {
    throw new Error('Team member not found')
  }

  await db
    .update(teamMember)
    .set({
      role,
      permissions: {
        canManageReceptionists: role !== 'viewer',
        canManageContacts: role !== 'viewer',
        canViewAnalytics: true,
        canManageTeam: role === 'admin',
        canManageBilling: role === 'admin',
      },
    })
    .where(eq(teamMember.id, memberId))

  revalidatePath('/dashboard')
}

export async function removeTeamMember(companyId: string, memberId: string) {
  await verifyCompanyAccess(companyId)

  const member = await db.select().from(teamMember).where(eq(teamMember.id, memberId))

  if (!member.length || member[0].companyId !== companyId) {
    throw new Error('Team member not found')
  }

  await db.delete(teamMember).where(eq(teamMember.id, memberId))

  revalidatePath('/dashboard')
}

export async function getTeamMembers(companyId: string) {
  await verifyCompanyAccess(companyId)

  return db
    .select({
      id: teamMember.id,
      userId: teamMember.userId,
      userName: user.name,
      userEmail: user.email,
      role: teamMember.role,
      createdAt: teamMember.createdAt,
    })
    .from(teamMember)
    .innerJoin(user, eq(teamMember.userId, user.id))
    .where(eq(teamMember.companyId, companyId))
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

  await db.update(company).set(data).where(eq(company.id, companyId))

  revalidatePath('/dashboard')
}
