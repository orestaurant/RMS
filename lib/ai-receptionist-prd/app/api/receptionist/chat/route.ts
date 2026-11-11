import { streamText } from 'ai'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { receptionist } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

interface RequestBody {
  receptionistId: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = (await request.json()) as RequestBody
    const { receptionistId, messages } = body

    if (!receptionistId || !messages) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Verify access
    const rec = await db
      .select()
      .from(receptionist)
      .where(eq(receptionist.id, receptionistId))

    if (!rec.length) {
      return new Response('Receptionist not found', { status: 404 })
    }

    const systemPrompt = rec[0].systemPrompt || `You are ${rec[0].name}, a professional and friendly AI receptionist for a business. 
Your main goals are to:
1. Answer calls professionally and courteously
2. Gather caller information and understand their needs
3. Schedule appointments when appropriate
4. Route calls to the right department
5. Handle objections professionally
6. Collect voicemails if needed

Always be professional, empathetic, and helpful. Keep responses concise but warm.
${rec[0].greetingMessage ? `Your standard greeting is: "${rec[0].greetingMessage}"` : ''}`

    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[v0] Chat API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
