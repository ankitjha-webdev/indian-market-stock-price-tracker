import axios from "axios"
import { prisma } from "@/lib/prisma"

interface NSEStockData {
  symbol: string
  companyName: string
  lastPrice: number
  pChange: number
  marketCap?: number
  pe?: number
  weekHigh52?: number
  weekLow52?: number
}

/**
 * Fetch stock data from NSE API or fallback to mock data
 * Note: NSE API requires proper headers and may have rate limits
 * For production, consider using a paid API service or implementing proper rate limiting
 */
export async function fetchStockData(symbol: string): Promise<NSEStockData | null> {
  try {
    // In production, replace this with actual NSE/BSE API
    // Example: https://www.nseindia.com/api/quote-equity?symbol=RELIANCE
    const response = await axios.get(`${process.env.NSE_API_URL}/quote-equity`, {
      params: { symbol },
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      timeout: 10000,
    })

    if (response.data) {
      return {
        symbol: response.data.info?.symbol || symbol,
        companyName: response.data.info?.companyName || symbol,
        lastPrice: response.data.priceInfo?.lastPrice || 0,
        pChange: response.data.priceInfo?.pChange || 0,
        marketCap: response.data.preOpenMarket?.marketCap,
        pe: response.data.keyIndicators?.pe,
        weekHigh52: response.data.priceInfo?.weekHigh52,
        weekLow52: response.data.priceInfo?.weekLow52,
      }
    }
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error)
    // Return null to allow fallback to mock data or existing data
    return null
  }

  return null
}

/**
 * Generate mock stock data for development/testing
 */
export function generateMockStockData(symbol: string): NSEStockData {
  const basePrice = Math.random() * 2000 + 100
  const peRatio = Math.random() * 30 + 10

  return {
    symbol,
    companyName: `${symbol} Ltd.`,
    lastPrice: parseFloat(basePrice.toFixed(2)),
    pChange: (Math.random() * 10 - 5).toFixed(2),
    marketCap: Math.random() * 50000 + 5000,
    pe: parseFloat(peRatio.toFixed(2)),
    weekHigh52: parseFloat((basePrice * 1.3).toFixed(2)),
    weekLow52: parseFloat((basePrice * 0.7).toFixed(2)),
  }
}

/**
 * Update or create stock in database
 */
export async function updateStockInDB(data: NSEStockData) {
  const stock = await prisma.stock.upsert({
    where: {
      symbol: data.symbol.toUpperCase(),
    },
    update: {
      name: data.companyName,
      currentPrice: data.lastPrice,
      peRatio: data.pe || null,
      weekHigh: data.weekHigh52 || data.lastPrice,
      weekLow: data.weekLow52 || data.lastPrice,
      marketCap: data.marketCap || null,
      updatedAt: new Date(),
    },
    create: {
      symbol: data.symbol.toUpperCase(),
      name: data.companyName,
      currentPrice: data.lastPrice,
      peRatio: data.pe || null,
      weekHigh: data.weekHigh52 || data.lastPrice,
      weekLow: data.weekLow52 || data.lastPrice,
      marketCap: data.marketCap || null,
      isTracked: false,
      isUndervalued: false,
    },
  })

  return stock
}

/**
 * Fetch and update multiple stocks
 */
export async function fetchAndUpdateStocks(symbols: string[]) {
  const results = []

  for (const symbol of symbols) {
    try {
      let stockData = await fetchStockData(symbol)

      // Fallback to mock data if API fails (for development)
      if (!stockData && process.env.NODE_ENV === "development") {
        stockData = generateMockStockData(symbol)
      }

      if (stockData) {
        const updated = await updateStockInDB(stockData)
        results.push({ symbol, success: true, stock: updated })
      } else {
        results.push({ symbol, success: false, error: "No data available" })
      }
    } catch (error) {
      console.error(`Error processing stock ${symbol}:`, error)
      results.push({ symbol, success: false, error: String(error) })
    }
  }

  return results
}

