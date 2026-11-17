import { NextRequest, NextResponse } from 'next/server'
import { GET as getDashboardNotifs, POST as postDashboardNotifs } from '@/app/api/dashboard-notifications/route'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Enforce role=VENDOR if not explicitly provided
  const url = new URL(request.url)
  if (!url.searchParams.has('role')) {
    url.searchParams.set('role', 'VENDOR')
  }
  const proxiedRequest = new NextRequest(url.toString(), {
    headers: request.headers,
  })
  return getDashboardNotifs(proxiedRequest)
}

export async function POST(request: NextRequest) {
  return postDashboardNotifs(request)
}
