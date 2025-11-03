import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/stocks
 * Get all stocks with optional filtering
 * Query params:
 * - tracked: filter by isTracked (true/false)
 * - undervalued: filter by isUndervalued (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tracked = searchParams.get("tracked")
    const undervalued = searchParams.get("undervalued")

    const where: {
      isTracked?: boolean
      isUndervalued?: boolean
    } = {}

    if (tracked === "true" || tracked === "false") {
      where.isTracked = tracked === "true"
    }

    if (undervalued === "true" || undervalued === "false") {
      where.isUndervalued = undervalued === "true"
    }

    const stocks = await prisma.stock.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json({
      success: true,
      count: stocks.length,
      stocks,
    })
  } catch (error) {
    console.error("Error in /api/stocks:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

