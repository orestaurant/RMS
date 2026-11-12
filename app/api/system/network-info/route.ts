import { NextResponse } from 'next/server'
import os from 'os'

export async function GET() {
  let lanIp = '127.0.0.1'
  try {
    const ifaces = os.networkInterfaces()
    for (const dev of Object.values(ifaces)) {
      if (!dev) continue
      for (const details of dev) {
        if (details.family === 'IPv4' && !details.internal && details.address !== '127.0.0.1') {
          lanIp = details.address
          break
        }
      }
      if (lanIp !== '127.0.0.1') break
    }
  } catch (err) {
    console.warn('Could not detect network interface:', err)
  }

  return NextResponse.json({
    success: true,
    ip: lanIp,
    port: process.env.PORT || '3000',
    networkUrl: `http://${lanIp}:${process.env.PORT || '3000'}`,
  })
}

