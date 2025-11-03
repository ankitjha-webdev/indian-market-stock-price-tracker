import { NextRequest, NextResponse } from "next/server"
import { fetchStockData, updateStockInDB } from "@/lib/stockService"

/**
 * GET /api/stocks/fetch?symbol=RELIANCE
 * Fetch real-time stock data for a single symbol
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get("symbol")

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter is required" },
        { status: 400 }
      )
    }

    const stockData = await fetchStockData(symbol.toUpperCase())

    if (!stockData) {
      // This should rarely happen as stockService has multiple fallbacks
      return NextResponse.json(
        { error: "Failed to fetch stock data" },
        { status: 404 }
      )
    }

    // Update database
    const updatedStock = await updateStockInDB(stockData)

    return NextResponse.json({
      success: true,
      stock: updatedStock,
    })
  } catch (error) {
    console.error("Error in /api/stocks/fetch:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stocks/fetch
 * Fetch multiple stocks at once
 * Body: { symbols: ["RELIANCE", "TCS", "INFY"] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols } = body

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: "Symbols array is required" },
        { status: 400 }
      )
    }

    const results = []

    for (const symbol of symbols) {
      try {
        const stockData = await fetchStockData(symbol.toUpperCase())

        if (stockData) {
          const updatedStock = await updateStockInDB(stockData)
          results.push({ symbol, success: true, stock: updatedStock })
        } else {
          results.push({ symbol, success: false, error: "No data available" })
        }
      } catch (error) {
        results.push({ symbol, success: false, error: String(error) })
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("Error in /api/stocks/fetch POST:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

