/**
 * /api/dj-requests
 * Handles Customer Song Playing Requests & DJ Sync Queue
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getDjRequests,
  addDjRequest,
  updateDjRequestStatus,
  DjRequestStatus,
} from '@/lib/dj-store'
import { addNotification } from '@/lib/notifications-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableNumber = searchParams.get('tableNumber') || searchParams.get('table') || undefined
    const status = searchParams.get('status') || undefined

    const requests = getDjRequests({ tableNumber, status })

    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length,
    })
  } catch (error: any) {
    console.error('Error fetching DJ requests:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch DJ requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      songTitle,
      artist,
      tableNumber = 'Table 1',
      guestName = 'Table Guest',
      notes,
    } = body

    if (!songTitle || !String(songTitle).trim()) {
      return NextResponse.json(
        { success: false, message: 'Song title is required' },
        { status: 400 }
      )
    }

    const cleanTitle = String(songTitle).trim()
    const cleanArtist = artist ? String(artist).trim() : undefined
    const cleanTable = String(tableNumber || 'Table 1').trim()
    const cleanGuest = String(guestName || 'Table Guest').trim()
    const cleanNotes = notes ? String(notes).trim() : undefined

    const newRequest = addDjRequest({
      songTitle: cleanTitle,
      artist: cleanArtist,
      tableNumber: cleanTable,
      guestName: cleanGuest,
      notes: cleanNotes,
      status: 'pending',
    })

    // Notify DJ and staff
    try {
      addNotification({
        type: 'alert',
        title: `🎵 Song Request: "${cleanTitle}"`,
        body: `${cleanTable} (${cleanGuest}) requested "${cleanTitle}"${cleanArtist ? ` by ${cleanArtist}` : ''}.`,
        metadata: {
          tableNumber: cleanTable,
        },
      })
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: 'Song request sent to DJ Booth!',
        data: newRequest,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error submitting DJ request:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to submit song request' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: 'id and status are required' },
        { status: 400 }
      )
    }

    const validStatuses: DjRequestStatus[] = ['pending', 'queued', 'playing', 'played', 'declined']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updated = updateDjRequestStatus(id, status)
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Song request not found' },
        { status: 404 }
      )
    }

    if (status === 'playing') {
      try {
        addNotification({
          type: 'alert',
          title: `🎧 Now Playing: "${updated.songTitle}"`,
          body: `Now playing for ${updated.tableNumber}! Requested by ${updated.guestName}.`,
          metadata: {
            tableNumber: updated.tableNumber,
          },
        })
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: `Song status updated to ${status}`,
      data: updated,
    })
  } catch (error: any) {
    console.error('Error updating DJ request:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update song request' },
      { status: 500 }
    )
  }
}
