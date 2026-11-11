import { pgTable, text, timestamp, boolean, integer, decimal, jsonb, uniqueIndex, index, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ==================== BETTER AUTH TABLES ====================
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

// ==================== ENUMS ====================
export const callStatusEnum = pgEnum('call_status', ['pending', 'ringing', 'active', 'completed', 'failed', 'missed'])
export const appointmentStatusEnum = pgEnum('appointment_status', ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
export const messageTypeEnum = pgEnum('message_type', ['sms', 'email', 'voice', 'whatsapp'])
export const companyPlanEnum = pgEnum('company_plan', ['free', 'starter', 'professional', 'enterprise'])
export const dealStatusEnum = pgEnum('deal_status', ['new', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
export const taskStatusEnum = pgEnum('task_status', ['open', 'in_progress', 'completed', 'cancelled'])

// ==================== COMPANY & SETTINGS ====================
export const company = pgTable('company', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id),
  name: text('name').notNull(),
  industry: text('industry'),
  website: text('website'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zipCode'),
  country: text('country'),
  timezone: text('timezone').default('UTC'),
  logo: text('logo'),
  plan: companyPlanEnum('plan').default('free'),
  status: text('status').default('active'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const receptionist = pgTable('receptionist', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  name: text('name').notNull(),
  voiceId: text('voiceId'),
  personality: text('personality'),
  language: text('language').default('en'),
  timezone: text('timezone'),
  instructions: text('instructions'),
  fallbackBehavior: text('fallbackBehavior'), // 'voicemail', 'transfer', 'voicemail_and_notify'
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const receptionistSchedule = pgTable('receptionist_schedule', {
  id: text('id').primaryKey(),
  receptionistId: text('receptionistId').notNull().references(() => receptionist.id),
  dayOfWeek: integer('dayOfWeek'), // 0-6 (Sunday-Saturday), null for all days
  startTime: text('startTime'), // HH:mm format
  endTime: text('endTime'), // HH:mm format
  isAvailable: boolean('isAvailable').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// ==================== CONTACTS & CRM ====================
export const contact = pgTable('contact', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  firstName: text('firstName').notNull(),
  lastName: text('lastName'),
  email: text('email'),
  phone: text('phone'),
  title: text('title'),
  department: text('department'),
  company: text('company'),
  source: text('source'), // 'website', 'inbound_call', 'manual', 'import'
  notes: text('notes'),
  tags: text('tags').array(), // Array of tag names
  customFields: jsonb('customFields'), // Flexible custom data
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const deal = pgTable('deal', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  contactId: text('contactId').notNull().references(() => contact.id),
  title: text('title').notNull(),
  description: text('description'),
  value: decimal('value', { precision: 12, scale: 2 }),
  status: dealStatusEnum('status').default('new'),
  expectedCloseDate: timestamp('expectedCloseDate'),
  priority: text('priority'), // 'low', 'medium', 'high'
  tags: text('tags').array(),
  customFields: jsonb('customFields'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const task = pgTable('task', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  contactId: text('contactId').references(() => contact.id),
  dealId: text('dealId').references(() => deal.id),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('open'),
  dueDate: timestamp('dueDate'),
  priority: text('priority'), // 'low', 'medium', 'high'
  assignedTo: text('assignedTo'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// ==================== CALLS & VOICE ====================
export const call = pgTable('call', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  receptionistId: text('receptionistId').notNull().references(() => receptionist.id),
  callerId: text('callerId'),
  callerName: text('callerName'),
  callerPhone: text('callerPhone'),
  internalExtension: text('internalExtension'),
  duration: integer('duration'), // seconds
  status: callStatusEnum('status').default('pending'),
  recordingUrl: text('recordingUrl'),
  transcription: text('transcription'),
  transcript: jsonb('transcript'), // Detailed call transcript with timestamps
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  endedAt: timestamp('endedAt'),
})

export const voicemail = pgTable('voicemail', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  callId: text('callId').references(() => call.id),
  callerPhone: text('callerPhone'),
  callerName: text('callerName'),
  duration: integer('duration'), // seconds
  audioUrl: text('audioUrl'),
  transcription: text('transcription'),
  isHeard: boolean('isHeard').default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// ==================== APPOINTMENTS & CALENDAR ====================
export const appointment = pgTable('appointment', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  contactId: text('contactId').notNull().references(() => contact.id),
  dealId: text('dealId').references(() => deal.id),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('startTime').notNull(),
  endTime: timestamp('endTime').notNull(),
  status: appointmentStatusEnum('status').default('pending'),
  type: text('type'), // 'call', 'meeting', 'email', 'other'
  location: text('location'),
  videoConferenceUrl: text('videoConferenceUrl'),
  externalCalendarId: text('externalCalendarId'), // For synced events
  externalCalendarEventId: text('externalCalendarEventId'),
  reminderSent: boolean('reminderSent').default(false),
  reminderTime: integer('reminderTime'), // minutes before
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const calendarIntegration = pgTable('calendar_integration', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  provider: text('provider'), // 'google', 'microsoft', 'caldav'
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  expiresAt: timestamp('expiresAt'),
  calendarId: text('calendarId'),
  isActive: boolean('isActive').default(true),
  syncEnabled: boolean('syncEnabled').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// ==================== MESSAGING ====================
export const message = pgTable('message', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  contactId: text('contactId').references(() => contact.id),
  callId: text('callId').references(() => call.id),
  type: messageTypeEnum('type'),
  direction: text('direction'), // 'inbound', 'outbound'
  content: text('content'),
  sender: text('sender'),
  recipient: text('recipient'),
  externalId: text('externalId'), // For SMS/WhatsApp tracking
  status: text('status'), // 'pending', 'sent', 'delivered', 'failed'
  readAt: timestamp('readAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const smsTemplate = pgTable('sms_template', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  name: text('name').notNull(),
  content: text('content').notNull(),
  variables: text('variables').array(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const emailTemplate = pgTable('email_template', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  htmlContent: text('htmlContent').notNull(),
  variables: text('variables').array(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// ==================== ANALYTICS & REPORTING ====================
export const callAnalytics = pgTable('call_analytics', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  date: timestamp('date').notNull(),
  totalCalls: integer('totalCalls').default(0),
  missedCalls: integer('missedCalls').default(0),
  averageDuration: integer('averageDuration').default(0), // seconds
  peakHour: integer('peakHour'), // 0-23
  conversionRate: decimal('conversionRate', { precision: 5, scale: 2 }),
  averageSentiment: text('averageSentiment'), // 'positive', 'neutral', 'negative'
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const appointmentAnalytics = pgTable('appointment_analytics', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  date: timestamp('date').notNull(),
  totalAppointments: integer('totalAppointments').default(0),
  completedAppointments: integer('completedAppointments').default(0),
  cancelledAppointments: integer('cancelledAppointments').default(0),
  noShowRate: decimal('noShowRate', { precision: 5, scale: 2 }),
  averageDuration: integer('averageDuration').default(0), // minutes
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const receptionistPerformance = pgTable('receptionist_performance', {
  id: text('id').primaryKey(),
  receptionistId: text('receptionistId').notNull().references(() => receptionist.id),
  date: timestamp('date').notNull(),
  callsHandled: integer('callsHandled').default(0),
  averageHandleTime: integer('averageHandleTime').default(0), // seconds
  missedCalls: integer('missedCalls').default(0),
  sentimentScore: decimal('sentimentScore', { precision: 3, scale: 2}),
  resolveRate: decimal('resolveRate', { precision: 5, scale: 2 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// ==================== BILLING & PAYMENTS ====================
export const subscription = pgTable('subscription', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  plan: companyPlanEnum('plan').notNull(),
  stripeSubscriptionId: text('stripeSubscriptionId'),
  stripeCustomerId: text('stripeCustomerId'),
  currentPeriodStart: timestamp('currentPeriodStart'),
  currentPeriodEnd: timestamp('currentPeriodEnd'),
  cancelledAt: timestamp('cancelledAt'),
  status: text('status'), // 'active', 'past_due', 'cancelled'
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const invoice = pgTable('invoice', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  subscriptionId: text('subscriptionId').references(() => subscription.id),
  stripeInvoiceId: text('stripeInvoiceId'),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').default('USD'),
  status: text('status'), // 'draft', 'sent', 'paid', 'void'
  dueDate: timestamp('dueDate'),
  paidAt: timestamp('paidAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const usage = pgTable('usage', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  date: timestamp('date').notNull(),
  incomingCalls: integer('incomingCalls').default(0),
  outgoingCalls: integer('outgoingCalls').default(0),
  smsCount: integer('smsCount').default(0),
  appointmentsScheduled: integer('appointmentsScheduled').default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// ==================== INTEGRATIONS ====================
export const integration = pgTable('integration', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  type: text('type'), // 'twilio', 'stripe', 'google_calendar', 'slack', 'hubspot', etc.
  name: text('name'),
  isActive: boolean('isActive').default(true),
  credentials: jsonb('credentials'), // Encrypted credentials
  metadata: jsonb('metadata'), // Integration-specific metadata
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const webhook = pgTable('webhook', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  event: text('event'), // 'call.completed', 'appointment.scheduled', etc.
  url: text('url').notNull(),
  secret: text('secret'),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// ==================== AUDIT & LOGGING ====================
export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull().references(() => company.id),
  userId: text('userId').references(() => user.id),
  action: text('action'),
  entityType: text('entityType'),
  entityId: text('entityId'),
  changes: jsonb('changes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// ==================== RELATIONS ====================
export const companyRelations = relations(company, ({ one, many }) => ({
  owner: one(user, { fields: [company.userId], references: [user.id] }),
  receptionists: many(receptionist),
  contacts: many(contact),
  deals: many(deal),
  tasks: many(task),
  calls: many(call),
  voicemails: many(voicemail),
  appointments: many(appointment),
  messages: many(message),
  subscription: one(subscription),
  integrations: many(integration),
}))

export const receptionistRelations = relations(receptionist, ({ one, many }) => ({
  company: one(company, { fields: [receptionist.companyId], references: [company.id] }),
  schedules: many(receptionistSchedule),
  calls: many(call),
  performances: many(receptionistPerformance),
}))

export const contactRelations = relations(contact, ({ one, many }) => ({
  company: one(company, { fields: [contact.companyId], references: [company.id] }),
  deals: many(deal),
  tasks: many(task),
  appointments: many(appointment),
  messages: many(message),
}))

export const dealRelations = relations(deal, ({ one, many }) => ({
  company: one(company, { fields: [deal.companyId], references: [company.id] }),
  contact: one(contact, { fields: [deal.contactId], references: [contact.id] }),
  tasks: many(task),
  appointments: many(appointment),
}))

export const callRelations = relations(call, ({ one, many }) => ({
  company: one(company, { fields: [call.companyId], references: [company.id] }),
  receptionist: one(receptionist, { fields: [call.receptionistId], references: [receptionist.id] }),
  messages: many(message),
  voicemail: one(voicemail),
}))

export const appointmentRelations = relations(appointment, ({ one, many }) => ({
  company: one(company, { fields: [appointment.companyId], references: [company.id] }),
  contact: one(contact, { fields: [appointment.contactId], references: [contact.id] }),
  deal: one(deal, { fields: [appointment.dealId], references: [deal.id] }),
  messages: many(message),
}))

export const subscriptionRelations = relations(subscription, ({ one, many }) => ({
  company: one(company, { fields: [subscription.companyId], references: [company.id] }),
  invoices: many(invoice),
}))

export const messageRelations = relations(message, ({ one }) => ({
  company: one(company, { fields: [message.companyId], references: [company.id] }),
  contact: one(contact, { fields: [message.contactId], references: [contact.id] }),
  call: one(call, { fields: [message.callId], references: [call.id] }),
  appointment: one(appointment, { fields: [message.id], references: [appointment.id] }),
}))

export const integrationRelations = relations(integration, ({ one }) => ({
  company: one(company, { fields: [integration.companyId], references: [company.id] }),
}))

export const voicemailRelations = relations(voicemail, ({ one }) => ({
  company: one(company, { fields: [voicemail.companyId], references: [company.id] }),
  call: one(call, { fields: [voicemail.callId], references: [call.id] }),
}))

export const taskRelations = relations(task, ({ one }) => ({
  company: one(company, { fields: [task.companyId], references: [company.id] }),
  contact: one(contact, { fields: [task.contactId], references: [contact.id] }),
  deal: one(deal, { fields: [task.dealId], references: [deal.id] }),
}))
