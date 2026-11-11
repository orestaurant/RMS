'use server'

import { streamText } from 'ai'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { receptionist } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getReceptionistWithAccess(receptionistId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const result = await db
    .select()
    .from(receptionist)
    .where(eq(receptionist.id, receptionistId))

  if (!result.length) {
    throw new Error('Receptionist not found')
  }

  return result[0]
}

export async function streamReceptionistResponse(
  receptionistId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  const rec = await getReceptionistWithAccess(receptionistId)

  const systemPrompt = rec.systemPrompt || `You are ${rec.name}, a professional and friendly AI receptionist for a business. 
Your main goals are to:
1. Answer calls professionally and courteously
2. Gather caller information and understand their needs
3. Schedule appointments when appropriate
4. Route calls to the right department
5. Handle objections professionally
6. Collect voicemails if needed

Always be professional, empathetic, and helpful. Keep responses concise but warm.
${rec.greetingMessage ? `Your standard greeting is: "${rec.greetingMessage}"` : ''}`

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: systemPrompt,
    messages,
  })

  return result.toTextStream()
}

export async function generateReceptionistGreeting(receptionistId: string) {
  const rec = await getReceptionistWithAccess(receptionistId)

  if (rec.greetingMessage) {
    return rec.greetingMessage
  }

  const result = await streamText({
    model: 'openai/gpt-4o-mini',
    prompt: `Generate a professional but friendly greeting message for an AI receptionist named ${rec.name}. 
Keep it short (1-2 sentences) and welcoming. Just return the greeting text, nothing else.`,
  })

  return await result.text
}
