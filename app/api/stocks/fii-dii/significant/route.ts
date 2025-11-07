import { NextRequest, NextResponse } from "next/server"
import { getStocksWithSignificantFiiDiiActivity } from "@/lib/fiiDiiService"

/**
 * GET /api/stocks/fii-dii/significant
 * Get stocks with significant FII/DII activity (increases >= threshold)
 * Query params:
 * - minChange: Minimum percentage change to consider (default: 5)
 * - limit: Limit number of results (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const minChangeParam = searchParams.get("minChange")
    const limitParam = searchParams.get("limit")

    const minChange = minChangeParam ? parseFloat(minChangeParam) : 5
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    // Get stocks with significant activity
    let stocks = await getStocksWithSignificantFiiDiiActivity(minChange)

    // Apply limit if specified
    if (limit) {
      stocks = stocks.slice(0, limit)
    }

    // Categorize by activity level
    const categorized = {
      extreme: stocks.filter((s) => s.activityLevel?.level === "extreme"),
      veryHigh: stocks.filter((s) => s.activityLevel?.level === "very-high"),
      high: stocks.filter((s) => s.activityLevel?.level === "high"),
    }

    return NextResponse.json({
      success: true,
      count: stocks.length,
      minChange,
      stocks,
      categorized,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in /api/stocks/fii-dii/significant:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

