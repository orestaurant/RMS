/**
 * POST /api/upload
 * Production-ready image upload endpoint for Dish Photos and Restaurant Assets
 * Supports both FormData file uploads and Base64 payloads with serverless fallback
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    // 1. Handle FormData (File Upload from Device)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file || typeof file === 'string') {
        return NextResponse.json(
          { success: false, message: 'No image file provided in request.' },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, message: 'Image size exceeds maximum limit of 10MB.' },
          { status: 400 }
        )
      }

      if (!ALLOWED_MIME_TYPES.has(file.type) && !file.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, message: `Unsupported file format (${file.type}). Please upload a JPG, PNG, WEBP or GIF.` },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Extension from file name or mime type
      const ext = path.extname(file.name) || `.${file.type.split('/')[1] || 'webp'}`
      const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase() || '.webp'
      const fileName = `dish_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${cleanExt}`

      // Attempt to save to public/uploads/dishes/
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'dishes')
        await mkdir(uploadDir, { recursive: true })
        const filePath = path.join(uploadDir, fileName)
        await writeFile(filePath, buffer)

        const publicUrl = `/uploads/dishes/${fileName}`
        return NextResponse.json({
          success: true,
          message: 'Image uploaded successfully to server storage.',
          url: publicUrl,
          fileName,
          size: file.size,
          mimeType: file.type,
        })
      } catch (fsErr) {
        // Fallback for Read-Only / Serverless environments (e.g. Vercel production read-only filesystem)
        console.warn('Filesystem write not permitted or serverless environment, converting to optimized data URL:', fsErr)
        const base64Data = buffer.toString('base64')
        const dataUrl = `data:${file.type};base64,${base64Data}`
        return NextResponse.json({
          success: true,
          message: 'Image processed successfully via web-ready data payload.',
          url: dataUrl,
          fileName,
          size: file.size,
          mimeType: file.type,
        })
      }
    }

    // 2. Handle JSON Payload with Base64 Image
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      const { base64, filename } = body

      if (!base64 || typeof base64 !== 'string') {
        return NextResponse.json(
          { success: false, message: 'Base64 image string is required.' },
          { status: 400 }
        )
      }

      const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        return NextResponse.json(
          { success: false, message: 'Invalid base64 image data URL format.' },
          { status: 400 }
        )
      }

      const mimeType = matches[1]
      const buffer = Buffer.from(matches[2], 'base64')
      const ext = `.${mimeType.split('/')[1] || 'webp'}`
      const fileName = filename ? filename.replace(/[^a-zA-Z0-9.-]/g, '_') : `dish_${Date.now()}${ext}`

      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'dishes')
        await mkdir(uploadDir, { recursive: true })
        const filePath = path.join(uploadDir, fileName)
        await writeFile(filePath, buffer)

        return NextResponse.json({
          success: true,
          message: 'Base64 image written to storage successfully.',
          url: `/uploads/dishes/${fileName}`,
          fileName,
        })
      } catch (fsErr) {
        return NextResponse.json({
          success: true,
          message: 'Image payload verified.',
          url: base64,
          fileName,
        })
      }
    }

    return NextResponse.json(
      { success: false, message: 'Expected multipart/form-data or application/json request body.' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Image upload failed on server.' },
      { status: 500 }
    )
  }
}
