import { NextRequest, NextResponse } from "next/server"
import { getAllNSEStockSymbols, fetchAndUpdateStocks } from "@/lib/stockService"
import { prisma } from "@/lib/prisma"
import { log } from "node:console"

/**
 * POST /api/stocks/populate-all
 * Populate database with all NSE stocks
 * 
 * Query params:
 * - batchSize: Number of stocks to process per batch (default: 10)
 * - delayBetweenBatches: Delay in ms between batches (default: 1000)
 * - delayBetweenRequests: Delay in ms between individual requests (default: 200)
 * - limit: Limit number of stocks to fetch (optional, for testing)
 * 
 * Note: This can take a long time as there are thousands of stocks on NSE.
 * Use limit parameter for testing.
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const batchSize = parseInt(searchParams.get("batchSize") || "10", 10)
    const delayBetweenBatches = parseInt(searchParams.get("delayBetweenBatches") || "1000", 10)
    const delayBetweenRequests = parseInt(searchParams.get("delayBetweenRequests") || "200", 10)
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    // Check if USE_REAL_API is enabled
    const useRealAPI = process.env.USE_REAL_API === "true"
    if (!useRealAPI) {
      return NextResponse.json(
        {
          error:
            "USE_REAL_API must be set to 'true' in .env to fetch all NSE stocks. " +
            "Set USE_REAL_API=true and restart the server.",
        },
        { status: 400 }
      )
    }

    console.log("Fetching all NSE stock symbols...")
    const allSymbols = await getAllNSEStockSymbols()

    if (!allSymbols || allSymbols.length === 0) {
      return NextResponse.json(
        {
          error: "No stock symbols found. Make sure USE_REAL_API=true and stock-nse-india package is working.",
          total: 0,
        },
        { status: 404 }
      )
    }

    // Apply limit if specified (for testing)
    const symbolsToProcess = limit ? allSymbols.slice(0, limit) : allSymbols
    console.log("symbolsToProcess-------------------", symbolsToProcess);

    console.log(`Found ${allSymbols.length} total stocks. Processing ${symbolsToProcess.length} stocks...`)

    // Check existing stocks in database
    const existingStocks = await prisma.stock.findMany({
      select: { symbol: true },
    })
    const existingSymbols = new Set(existingStocks.map((s: { symbol: string }) => s.symbol))

    console.log(`Database already has ${existingSymbols.size} stocks`)

    // Start processing stocks
    const startTime = Date.now()

    const updateResults = await fetchAndUpdateStocks(symbolsToProcess, {
      batchSize,
      delayBetweenBatches,
      delayBetweenRequests,
    })

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    const successCount = updateResults.filter((r) => r.success).length
    const failCount = updateResults.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Processed ${symbolsToProcess.length} stocks`,
      summary: {
        totalSymbols: allSymbols.length,
        processed: symbolsToProcess.length,
        success: successCount,
        failed: failCount,
        duration: `${duration}s`,
        existingInDB: existingSymbols.size,
      },
      results: updateResults.slice(0, 100), // Return first 100 results to avoid huge response
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in /api/stocks/populate-all:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stocks/populate-all
 * Same as POST, but with query params for easier testing
 * Only works in development mode
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Method not allowed in production" }, { status: 405 })
  }

  // Create a POST request with the same URL (to reuse POST logic)
  const postRequest = new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
  })

  return POST(postRequest)
}

