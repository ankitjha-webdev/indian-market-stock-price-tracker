import { NextRequest, NextResponse } from "next/server"
import { fetchAndUpdateStocks } from "@/lib/stockService"
import { getAvailableDummyStockSymbols } from "@/lib/dummyStockData"

/**
 * POST /api/stocks/seed
 * Seed database with dummy stock data for all available stocks
 * Useful for initial setup and development
 */
export async function POST(request: NextRequest) {
  try {
    // Get all available dummy stock symbols
    const allSymbols = getAvailableDummyStockSymbols()

    // Fetch and update all stocks
    const results = await fetchAndUpdateStocks(allSymbols)

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Seeded ${successCount} stocks successfully`,
      total: allSymbols.length,
      successCount,
      failCount,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error seeding stocks:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stocks/seed
 * Same as POST, but accessible via GET for easy browser access in development
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
  }

  return POST(request)
}

