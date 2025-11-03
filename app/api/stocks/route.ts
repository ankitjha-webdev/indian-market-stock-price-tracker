import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUndervaluedStocks } from "@/lib/getUndervaluedStocks"

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

    // If filtering by undervalued, ensure flags are up-to-date
    if (undervalued === "true") {
      // Recalculate undervalued stocks to ensure flags are current
      await getUndervaluedStocks()
    }

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

