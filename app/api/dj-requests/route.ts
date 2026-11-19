/**
 * /api/dj-requests
 * Handles Real-Time Customer Song Playing Requests & DJ Booth Sync Queue
 * Fast, lightweight queries with payload < 5KB and instant 0ms in-memory response.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getDjRequests,
  getDjStats,
  addDjRequest,
  updateDjRequestStatus,
  deleteDjRequest,
  DjRequestStatus,
} from '@/lib/dj-store'
import { addNotification } from '@/lib/notifications-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableNumber = searchParams.get('tableNumber') || searchParams.get('table') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50

    const requests = await getDjRequests({ tableNumber, status, search, limit })
    const stats = await getDjStats()

    return NextResponse.json(
      {
        success: true,
        data: requests,
        stats,
        count: requests.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    )
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
      language,
      tableNumber = 'Table 1',
      guestName = 'Table Guest',
      notes,
      requestedBy = 'Customer',
    } = body

    if (!songTitle || !String(songTitle).trim()) {
      return NextResponse.json(
        { success: false, message: 'Song title is required' },
        { status: 400 }
      )
    }

    const cleanTitle = String(songTitle).trim()
    const cleanArtist = artist ? String(artist).trim() : undefined
    const cleanLanguage = language ? String(language).trim() : undefined
    const cleanTable = String(tableNumber || 'Table 1').trim()
    const cleanGuest = String(guestName || 'Table Guest').trim()
    const cleanNotes = notes ? String(notes).trim() : undefined
    const cleanRequestedBy = requestedBy === 'Waiter' ? 'Waiter' : 'Customer'

    const newRequest = await addDjRequest({
      songTitle: cleanTitle,
      artist: cleanArtist,
      language: cleanLanguage,
      tableNumber: cleanTable,
      guestName: cleanGuest,
      requestedBy: cleanRequestedBy,
      notes: cleanNotes,
      status: 'pending',
    })

    // Notify DJ and floor staff
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

    const updated = await updateDjRequestStatus(id, status)
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, message: 'id parameter is required' }, { status: 400 })
    }

    const deleted = await deleteDjRequest(id)
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Song request not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Song request deleted from queue',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete song request' },
      { status: 500 }
    )
  }
}
