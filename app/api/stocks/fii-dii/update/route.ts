import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { saveFiiDiiData, fetchFiiDiiData, getCurrentQuarter } from "@/lib/fiiDiiService"

/**
 * POST /api/stocks/fii-dii/update
 * Update FII/DII data for multiple stocks
 * Can be called from cron job or manually
 * 
 * Query params:
 * - all=true: Process all stocks in the database (default: false, only tracked stocks)
 * - batchSize: Number of stocks to process per batch (default: 10)
 * - delayBetweenBatches: Delay in ms between batches (default: 1000)
 * - delayBetweenRequests: Delay in ms between individual requests (default: 200)
 * - limit: Limit number of stocks to process (optional, for testing)
 * 
 * Body:
 * - symbols: Array of specific stock symbols to update (optional)
 * - quarter: Specific quarter to fetch (optional, defaults to current quarter)
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const body = await request.json().catch(() => ({}))
    
    const { symbols, quarter } = body
    const processAll = searchParams.get("all") === "true" || body.all === true
    const batchSize = parseInt(searchParams.get("batchSize") || body.batchSize || "10", 10)
    const delayBetweenBatches = parseInt(searchParams.get("delayBetweenBatches") || body.delayBetweenBatches || "1000", 10)
    const delayBetweenRequests = parseInt(searchParams.get("delayBetweenRequests") || body.delayBetweenRequests || "200", 10)
    const limitParam = searchParams.get("limit") || body.limit
    const limit = limitParam ? parseInt(limitParam.toString(), 10) : undefined

    // Get stocks to update
    let stocksToUpdate
    if (symbols && Array.isArray(symbols)) {
      // Specific symbols provided
      stocksToUpdate = await prisma.stock.findMany({
        where: {
          symbol: {
            in: symbols.map((s: string) => s.toUpperCase()),
          },
        },
      })
    } else if (processAll) {
      // Process ALL stocks in the database
      stocksToUpdate = await prisma.stock.findMany({
        orderBy: {
          symbol: "asc",
        },
      })
      
      // Apply limit if specified
      if (limit) {
        stocksToUpdate = stocksToUpdate.slice(0, limit)
      }
      
      console.log(`Processing FII/DII data for ALL stocks (${stocksToUpdate.length} stocks)`)
    } else {
      // Default: Update tracked stocks, or popular stocks if none tracked
      const trackedStocks = await prisma.stock.findMany({
        where: { isTracked: true },
        select: { symbol: true },
        take: 50,
      })

      stocksToUpdate = await prisma.stock.findMany({
        where: {
          symbol: {
            in:
              trackedStocks.length > 0
                ? trackedStocks.map((s: { symbol: string }) => s.symbol)
                : [
                    "RELIANCE",
                    "TCS",
                    "HDFCBANK",
                    "INFY",
                    "HINDUNILVR",
                    "ICICIBANK",
                    "BHARTIARTL",
                    "SBIN",
                    "BAJFINANCE",
                    "ITC",
                  ],
          },
        },
        take: 50,
      })
    }

    if (!stocksToUpdate || stocksToUpdate.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No stocks found to update",
        message: processAll 
          ? "No stocks found in database. Please populate stocks first."
          : "No tracked stocks found.",
      })
    }

    const targetQuarter = quarter || getCurrentQuarter()
    const results: any[] = []
    const startTime = Date.now()

    // Process stocks in batches
    for (let i = 0; i < stocksToUpdate.length; i += batchSize) {
      const batch = stocksToUpdate.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(stocksToUpdate.length / batchSize)
      
      console.log(`Processing FII/DII batch ${batchNumber}/${totalBatches} (${batch.length} stocks)`)

      for (const stock of batch) {
        try {
          const fiiDiiData = await fetchFiiDiiData(stock.symbol, targetQuarter)

          if (fiiDiiData) {
            const saved = await saveFiiDiiData(stock.id, fiiDiiData)
            results.push({
              symbol: stock.symbol,
              success: true,
              holding: saved,
            })
          } else {
            results.push({
              symbol: stock.symbol,
              success: false,
              error: "Failed to fetch FII/DII data",
            })
          }
          
          // Delay between requests to avoid rate limiting
          if (delayBetweenRequests > 0 && i + batch.length < stocksToUpdate.length) {
            await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests))
          }
        } catch (error) {
          console.error(`Error updating FII/DII for ${stock.symbol}:`, error)
          results.push({
            symbol: stock.symbol,
            success: false,
            error: String(error),
          })
        }
      }

      // Delay between batches
      if (i + batchSize < stocksToUpdate.length && delayBetweenBatches > 0) {
        console.log(`Waiting ${delayBetweenBatches}ms before next batch...`)
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
      }
    }

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Updated FII/DII data for ${successCount}/${results.length} stocks`,
      quarter: targetQuarter,
      summary: {
        total: stocksToUpdate.length,
        processed: results.length,
        success: successCount,
        failed: failCount,
        duration: `${duration}s`,
      },
      results: results.slice(0, 100), // Return first 100 to avoid huge response
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in /api/stocks/fii-dii/update:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stocks/fii-dii/update
 * Manual trigger for testing (same as POST)
 * Query params: ?all=true&limit=50&batchSize=10
 */
export async function GET(request: NextRequest) {
  // Create a POST request with the same URL and query params (to reuse POST logic)
  const postRequest = new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
  })

  return POST(postRequest)
}

