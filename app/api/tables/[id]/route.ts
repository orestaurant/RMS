import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      throw new ValidationError('Table ID is required')
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { id },
    })

    if (!table) {
      return NextResponse.json(errorResponse('Table not found', 'NOT_FOUND'), { status: 404 })
    }

    try {
      await prisma.restaurantTable.delete({
        where: { id },
      })
      return NextResponse.json(successResponse(null, `Table ${table.tableNumber} deleted successfully`))
    } catch (dbErr: any) {
      await prisma.restaurantTable.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      })
      return NextResponse.json(successResponse(null, `Table ${table.tableNumber} deleted successfully`))
    }
  } catch (error: any) {
    console.error('Error deleting table [id]:', error)
    if (error instanceof ValidationError) {
      return NextResponse.json(errorResponse(error.message, error.code), { status: 400 })
    }
    return NextResponse.json(errorResponse(error.message, 'TABLE_DELETE_ERROR'), { status: 500 })
  }
}

