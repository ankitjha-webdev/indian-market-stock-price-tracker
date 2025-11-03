import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/stocks/[id]/track
 * Toggle tracking status for a stock
 * Body: { isTracked: true/false }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params
    const body = await request.json()
    const { isTracked } = body

    if (typeof isTracked !== "boolean") {
      return NextResponse.json(
        { error: "isTracked must be a boolean" },
        { status: 400 }
      )
    }

    const stock = await prisma.stock.update({
      where: { id },
      data: { isTracked },
    })

    return NextResponse.json({
      success: true,
      stock,
    })
  } catch (error) {
    console.error("Error in /api/stocks/[id]/track:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

