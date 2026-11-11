'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { appointment, company } from '@/lib/db/schema'
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

export async function createAppointment(data: {
  companyId: string
  contactId?: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  conferenceUrl?: string
}) {
  await verifyCompanyAccess(data.companyId)

  const newAppointment = await db
    .insert(appointment)
    .values({
      id: `appt_${Date.now()}`,
      companyId: data.companyId,
      contactId: data.contactId,
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      status: 'pending',
      location: data.location,
      conferenceUrl: data.conferenceUrl,
      reminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  revalidatePath('/dashboard')
  return newAppointment[0]
}

export async function getAppointmentsByCompany(companyId: string) {
  await verifyCompanyAccess(companyId)

  return db
    .select()
    .from(appointment)
    .where(eq(appointment.companyId, companyId))
}

export async function getUpcomingAppointments(companyId: string) {
  await verifyCompanyAccess(companyId)

  const now = new Date()
  const appointments = await db
    .select()
    .from(appointment)
    .where(eq(appointment.companyId, companyId))

  return appointments.filter((a) => new Date(a.startTime) > now).sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
}

export async function getAppointmentById(appointmentId: string) {
  const result = await db
    .select()
    .from(appointment)
    .where(eq(appointment.id, appointmentId))

  if (!result.length) {
    throw new Error('Appointment not found')
  }

  await verifyCompanyAccess(result[0].companyId)
  return result[0]
}

export async function updateAppointment(
  appointmentId: string,
  data: Partial<{
    title: string
    description: string
    startTime: Date
    endTime: Date
    status: string
    location: string
    conferenceUrl: string
    reminderSent: boolean
  }>
) {
  const existing = await db
    .select()
    .from(appointment)
    .where(eq(appointment.id, appointmentId))

  if (!existing.length) {
    throw new Error('Appointment not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  const updated = await db
    .update(appointment)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(appointment.id, appointmentId))
    .returning()

  revalidatePath('/dashboard')
  return updated[0]
}

export async function deleteAppointment(appointmentId: string) {
  const existing = await db
    .select()
    .from(appointment)
    .where(eq(appointment.id, appointmentId))

  if (!existing.length) {
    throw new Error('Appointment not found')
  }

  await verifyCompanyAccess(existing[0].companyId)

  await db.delete(appointment).where(eq(appointment.id, appointmentId))
  revalidatePath('/dashboard')
}

export async function getAppointmentStats(companyId: string) {
  await verifyCompanyAccess(companyId)

  const appointments = await db
    .select()
    .from(appointment)
    .where(eq(appointment.companyId, companyId))

  const now = new Date()
  const upcoming = appointments.filter((a) => new Date(a.startTime) > now).length
  const completed = appointments.filter((a) => a.status === 'completed').length
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length

  return {
    totalAppointments: appointments.length,
    upcomingAppointments: upcoming,
    completedAppointments: completed,
    cancelledAppointments: cancelled,
  }
}
