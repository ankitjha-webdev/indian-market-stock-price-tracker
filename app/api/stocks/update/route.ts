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
 * Vercel Cron uses GET requests with User-Agent "vercel-cron/1.0"
 * This handler processes GET requests from Vercel Cron
 */
export async function GET(request: NextRequest) {
  // Check if this is a Vercel Cron request
  // Vercel Cron sends User-Agent: "vercel-cron/1.0"
  const userAgent = (request.headers.get("user-agent") || "").toLowerCase()
  const hasVercelSignature = request.headers.get("x-vercel-signature") !== null
  const isVercelCron = userAgent.includes("vercel-cron") || hasVercelSignature
  
  // Log for debugging
  console.log(`[GET] User-Agent: ${request.headers.get("user-agent")}, IsVercelCron: ${isVercelCron}, Env: ${process.env.NODE_ENV}`)
  
  // In production, only allow Vercel Cron GET requests
  // In development, allow all GET requests for testing
  if (process.env.NODE_ENV === "production" && !isVercelCron) {
    console.log(`[GET] Blocked - Not a Vercel Cron request`)
    return NextResponse.json({ 
      error: "Method not allowed",
      message: "GET requests are only allowed from Vercel Cron in production",
      userAgent: request.headers.get("user-agent"),
    }, { status: 405 })
  }

  // For Vercel Cron or development, execute the same logic as POST
  // Instead of calling POST function, duplicate the logic to avoid header issues
  try {
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
    console.error("Error in /api/stocks/update GET:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

