import { NextRequest, NextResponse } from "next/server"
import { getUndervaluedStocks } from "@/lib/getUndervaluedStocks"

/**
 * GET /api/stocks/undervalued
 * Returns list of undervalued stocks sorted by score
 * Query params:
 * - limit: number of stocks to return (default: all)
 * - minScore: minimum undervalued score (default: 30)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limitParam = searchParams.get("limit")
    const minScoreParam = searchParams.get("minScore")

    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const minScore = minScoreParam ? parseInt(minScoreParam, 10) : 30

    // Get undervalued stocks
    let undervaluedStocks = await getUndervaluedStocks()

    // Filter by minimum score
    undervaluedStocks = undervaluedStocks.filter(
      (stock) => stock.undervaluedScore >= minScore
    )

    // Limit results
    if (limit) {
      undervaluedStocks = undervaluedStocks.slice(0, limit)
    }

    // Get top 3 buy candidates
    const topBuyCandidates = undervaluedStocks.slice(0, 3)

    return NextResponse.json({
      success: true,
      count: undervaluedStocks.length,
      stocks: undervaluedStocks,
      topBuyCandidates,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in /api/stocks/undervalued:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

