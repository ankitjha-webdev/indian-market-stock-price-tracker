import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { saveFiiDiiData, fetchFiiDiiData, getCurrentQuarter } from "@/lib/fiiDiiService"

/**
 * GET /api/stocks/fii-dii
 * Get FII/DII data for stocks
 * Query params:
 * - symbol: Get data for specific stock
 * - quarter: Get data for specific quarter (default: current quarter)
 * - significant: Filter only significant changes (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get("symbol")
    const quarter = searchParams.get("quarter") || getCurrentQuarter()
    const significant = searchParams.get("significant")

    if (symbol) {
      // Get data for specific stock
      const stock = await prisma.stock.findUnique({
        where: { symbol: symbol.toUpperCase() },
        include: {
          fiiDiiData: {
            where: quarter ? { quarter } : undefined,
            orderBy: {
              quarter: "desc",
            },
          },
        },
      })

      if (!stock) {
        return NextResponse.json({ error: "Stock not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        stock: {
          ...stock,
          fiiDiiData: stock.fiiDiiData,
        },
      })
    }

    // Get all stocks with FII/DII data
    const where: any = {}
    if (significant === "true") {
      where.isSignificant = true
    }

    const holdings = await prisma.fiiDiiHolding.findMany({
      where,
      include: {
        stock: true,
      },
      orderBy: {
        quarter: "desc",
      },
    })

    return NextResponse.json({
      success: true,
      count: holdings.length,
      holdings,
    })
  } catch (error) {
    console.error("Error in /api/stocks/fii-dii:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stocks/fii-dii
 * Update FII/DII data for a stock
 * Body: { symbol: "RELIANCE", quarter?: "Q1-2025", fiiHolding: 25.5, diiHolding: 15.2 }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, quarter, fiiHolding, diiHolding, totalInstitutional } = body

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }

    // Find stock
    const stock = await prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
    })

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 })
    }

    // Fetch or create FII/DII data
    const fiiDiiData = await fetchFiiDiiData(symbol, quarter)

    if (!fiiDiiData) {
      return NextResponse.json(
        { error: "Failed to fetch FII/DII data" },
        { status: 500 }
      )
    }

    // Override with provided values if any
    if (fiiHolding !== undefined) fiiDiiData.fiiHolding = fiiHolding
    if (diiHolding !== undefined) fiiDiiData.diiHolding = diiHolding
    if (totalInstitutional !== undefined)
      fiiDiiData.totalInstitutional = totalInstitutional

    // Save data
    const saved = await saveFiiDiiData(stock.id, fiiDiiData)

    return NextResponse.json({
      success: true,
      holding: saved,
    })
  } catch (error) {
    console.error("Error in /api/stocks/fii-dii POST:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

