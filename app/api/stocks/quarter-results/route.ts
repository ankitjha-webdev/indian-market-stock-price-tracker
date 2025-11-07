import { NextRequest, NextResponse } from "next/server"
import {
  getUpcomingQuarterResults,
  getQuarterResultsGroupedByDate,
  generateQuarterResultsForAllStocks,
} from "@/lib/quarterResultsService"

/**
 * GET /api/stocks/quarter-results
 * Get upcoming quarter results
 * Query params:
 * - daysAhead: Number of days to look ahead (default: 60)
 * - includeAnnounced: Include already announced results (default: false)
 * - grouped: Group results by date (default: false)
 * - limit: Limit number of results
 * - fetchFromNSE: Fetch fresh data from NSE (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const daysAhead = searchParams.get("daysAhead")
    const includeAnnounced = searchParams.get("includeAnnounced")
    const grouped = searchParams.get("grouped")
    const limit = searchParams.get("limit")
    const fetchFromNSE = searchParams.get("fetchFromNSE") === "true"

    const options = {
      daysAhead: daysAhead ? parseInt(daysAhead) : undefined,
      includeAnnounced: includeAnnounced === "true",
      limit: limit ? parseInt(limit) : undefined,
      fetchFromNSE,
    }

    if (grouped === "true") {
      const groupedResults = await getQuarterResultsGroupedByDate(options)
      const totalCount = groupedResults.announced.length + groupedResults.upcoming.length
      return NextResponse.json({
        success: true,
        count: totalCount,
        announcedCount: groupedResults.announced.length,
        upcomingCount: groupedResults.upcoming.length,
        grouped: groupedResults,
      })
    } else {
      const results = await getUpcomingQuarterResults(options)
      return NextResponse.json({
        success: true,
        count: results.length,
        results,
      })
    }
  } catch (error) {
    console.error("Error in /api/stocks/quarter-results:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stocks/quarter-results
 * Generate quarter results for all stocks
 */
export async function POST(request: NextRequest) {
  try {
    const results = await generateQuarterResultsForAllStocks()
    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Generated quarter results for stocks`,
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results,
    })
  } catch (error) {
    console.error("Error in /api/stocks/quarter-results POST:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

