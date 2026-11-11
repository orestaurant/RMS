import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Check if category has menu items
    const itemCount = await prisma.menuItem.count({
      where: { categoryId: id, deletedAt: null },
    })

    if (itemCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete category with ${itemCount} active menu items. Please reassign or delete the items first.`,
        },
        { status: 400 }
      )
    }

    await prisma.menuCategory.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, status: 'inactive' },
    })

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete category' },
      { status: 500 }
    )
  }
}

