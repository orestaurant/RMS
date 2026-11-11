'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { call, company, deal, contact, appointment, message } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

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

export async function getCompanyAnalytics(companyId: string) {
  await verifyCompanyAccess(companyId)

  // Fetch all data
  const calls = await db.select().from(call).where(eq(call.companyId, companyId))
  const deals = await db.select().from(deal).where(eq(deal.companyId, companyId))
  const contacts = await db.select().from(contact).where(eq(contact.companyId, companyId))
  const appointments = await db.select().from(appointment).where(eq(appointment.companyId, companyId))
  const messages = await db.select().from(message).where(eq(message.companyId, companyId))

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Call metrics
  const totalCalls = calls.length
  const completedCalls = calls.filter((c) => c.status === 'completed').length
  const missedCalls = calls.filter((c) => c.status === 'missed').length
  const recentCalls = calls.filter((c) => new Date(c.createdAt) > thirtyDaysAgo).length
  const avgCallDuration =
    calls.filter((c) => c.duration).length > 0
      ? Math.round(
          calls.filter((c) => c.duration).reduce((sum, c) => sum + (c.duration || 0), 0) /
            calls.filter((c) => c.duration).length
        )
      : 0

  // Deal metrics
  const totalDeals = deals.length
  const wonDeals = deals.filter((d) => d.status === 'closed_won').length
  const openDeals = deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.status)).length
  const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)

  // Contact metrics
  const totalContacts = contacts.length
  const newContacts = contacts.filter((c) => new Date(c.createdAt) > thirtyDaysAgo).length

  // Appointment metrics
  const totalAppointments = appointments.length
  const upcomingAppointments = appointments.filter((a) => new Date(a.startTime) > now).length
  const completedAppointments = appointments.filter((a) => a.status === 'completed').length

  // Message metrics
  const totalMessages = messages.length
  const smsMessages = messages.filter((m) => m.messageType === 'sms').length
  const emailMessages = messages.filter((m) => m.messageType === 'email').length
  const sentMessages = messages.filter((m) => m.status === 'sent' || m.status === 'delivered').length

  return {
    overview: {
      totalCalls,
      totalContacts,
      totalDeals,
      totalAppointments,
    },
    calls: {
      totalCalls,
      completedCalls,
      missedCalls,
      failedCalls: calls.filter((c) => c.status === 'failed').length,
      recentCalls,
      avgCallDuration,
      callSuccessRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
    },
    deals: {
      totalDeals,
      wonDeals,
      openDeals,
      totalDealValue,
      winRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
      avgDealValue: totalDeals > 0 ? Math.round(totalDealValue / totalDeals) : 0,
    },
    contacts: {
      totalContacts,
      newContacts,
    },
    appointments: {
      totalAppointments,
      upcomingAppointments,
      completedAppointments,
      cancelledAppointments: appointments.filter((a) => a.status === 'cancelled').length,
    },
    messages: {
      totalMessages,
      smsMessages,
      emailMessages,
      sentMessages,
    },
  }
}

export async function getCallTrends(companyId: string) {
  await verifyCompanyAccess(companyId)

  const calls = await db.select().from(call).where(eq(call.companyId, companyId))

  // Group by day for the last 7 days
  const trends = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const daysCalls = calls.filter((c) => {
      const callDate = new Date(c.createdAt).toISOString().split('T')[0]
      return callDate === dateStr
    })

    trends.push({
      date: dateStr,
      calls: daysCalls.length,
      completed: daysCalls.filter((c) => c.status === 'completed').length,
      missed: daysCalls.filter((c) => c.status === 'missed').length,
    })
  }

  return trends
}

export async function getTopMetrics(companyId: string) {
  await verifyCompanyAccess(companyId)

  const deals = await db.select().from(deal).where(eq(deal.companyId, companyId))
  const calls = await db.select().from(call).where(eq(call.companyId, companyId))

  const topDeals = deals.sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5)

  const topContactsByInteractions: { [key: string]: number } = {}
  calls.forEach((c) => {
    if (c.contactId) {
      topContactsByInteractions[c.contactId] = (topContactsByInteractions[c.contactId] || 0) + 1
    }
  })

  const topContacts = Object.entries(topContactsByInteractions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return {
    topDeals,
    topContacts,
  }
}
