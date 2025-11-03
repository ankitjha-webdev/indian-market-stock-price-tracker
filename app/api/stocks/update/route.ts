import { NextRequest, NextResponse } from "next/server"
import { fetchAndUpdateStocks } from "@/lib/stockService"
import { prisma } from "@/lib/prisma"
import { getUndervaluedStocks } from "@/lib/getUndervaluedStocks"
import { getPopularStockSymbols } from "@/lib/dummyStockData"

/**
 * POST /api/stocks/update
 * Cron endpoint to update all tracked stocks and recalculate undervalued stocks
 * 
 * Security:
 * - For Vercel Cron: Automatically verified by Vercel (x-vercel-signature header)
 * - For manual/external: Requires CRON_SECRET in Authorization header
 */
export async function POST(request: NextRequest) {
  try {
    // Check if this is a Vercel Cron request
    const isVercelCron = request.headers.get("x-vercel-signature")
    
    // If not Vercel Cron, verify authorization header
    if (!isVercelCron) {
      const authHeader = request.headers.get("authorization")
      const cronSecret = process.env.CRON_SECRET

      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Get all tracked stocks or popular Indian stocks
    const trackedStocks = await prisma.stock.findMany({
      where: {
        isTracked: true,
      },
      select: {
        symbol: true,
      },
    })

    // If no tracked stocks, use popular NSE stocks (from dummy data list)
    const symbolsToUpdate =
      trackedStocks.length > 0
        ? trackedStocks.map((s: { symbol: string }) => s.symbol)
        : getPopularStockSymbols()

    // Fetch and update stocks
    const updateResults = await fetchAndUpdateStocks(symbolsToUpdate)

    // Recalculate undervalued stocks
    const undervaluedStocks = await getUndervaluedStocks()

    return NextResponse.json({
      success: true,
      updated: updateResults.length,
      results: updateResults,
      undervaluedCount: undervaluedStocks.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in /api/stocks/update:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stocks/update
 * Vercel Cron uses GET requests, so we need to handle them
 * Manual trigger for testing (same as POST)
 */
export async function GET(request: NextRequest) {
  // Check if this is a Vercel Cron request (GET with x-vercel-signature header)
  const isVercelCron = request.headers.get("x-vercel-signature")
  
  // Allow Vercel Cron GET requests in production
  // Allow manual GET requests in development
  if (process.env.NODE_ENV === "production" && !isVercelCron) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
  }

  // Reuse POST logic - create a POST request internally
  const postRequest = new NextRequest(request.url, {
    method: "POST",
    headers: request.headers, // Preserve headers including x-vercel-signature
  })

  return POST(postRequest)
}

