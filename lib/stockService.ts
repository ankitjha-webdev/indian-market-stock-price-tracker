import { prisma } from "@/lib/prisma"
import { getDummyStockData } from "@/lib/dummyStockData"

// Lazy load stock-nse-india only when real API is needed
let NseIndia: any = null
let nseIndiaInstance: any = null

function getNseIndiaInstance() {
  if (!NseIndia) {
    try {
      // Dynamic require for optional dependency (only loaded when USE_REAL_API=true)
      NseIndia = require("stock-nse-india").NseIndia
      
    } catch (error) {
      console.error("Failed to load stock-nse-india package:", error)
      return null
    }
  }
  if (!nseIndiaInstance && NseIndia) {
    nseIndiaInstance = new NseIndia()
    console.log("nseIndiaInstance-------------------", nseIndiaInstance);
  }
  return nseIndiaInstance
}

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
 * Use dummy data by default. Set USE_REAL_API=true in .env to use live API.
 * This makes it easy to switch between dummy and real data.
 */
const USE_DUMMY_DATA = process.env.USE_REAL_API !== "true"

/**
 * Fetch stock data from NSE API using stock-nse-india package or use dummy data
 * 
 * To switch to real API:
 * 1. Set USE_REAL_API=true in your .env file
 * 2. The function will automatically use the stock-nse-india package
 */
export async function fetchStockData(symbol: string): Promise<NSEStockData | null> {
  // Use dummy data by default (easy to switch)
  if (USE_DUMMY_DATA) {
    const dummyData = getDummyStockData(symbol)
    if (dummyData) {
      return {
        symbol: dummyData.symbol,
        companyName: dummyData.companyName,
        lastPrice: dummyData.lastPrice,
        pChange: dummyData.pChange,
        marketCap: dummyData.marketCap,
        pe: dummyData.pe,
        weekHigh52: dummyData.weekHigh52,
        weekLow52: dummyData.weekLow52,
      }
    }
    // If symbol not in dummy data, generate generic mock data
    return generateMockStockData(symbol)
  }

  // Real API call using stock-nse-india package (only used when USE_REAL_API=true)
  try {
    const nseIndia = getNseIndiaInstance()

    if (!nseIndia) {
      console.warn("stock-nse-india package not available, falling back to dummy data")
      return getDummyStockData(symbol) || generateMockStockData(symbol)
    }

    // Fetch equity details from NSE
    const stockDetails = await nseIndia.getEquityDetails(symbol.toUpperCase())

    if (stockDetails && stockDetails.info && stockDetails.priceInfo) {
      // Extract P/E Ratio from metadata.pdSymbolPe (actual location in API response)
      let peRatio: number | undefined
      if (stockDetails.metadata?.pdSymbolPe && stockDetails.metadata.pdSymbolPe !== "NA") {
        const peValue = parseFloat(stockDetails.metadata.pdSymbolPe.toString())
        if (!isNaN(peValue)) {
          peRatio = peValue
        }
      }

      // Calculate Market Cap from lastPrice * issuedSize (not directly provided in API)
      let marketCap: number | undefined
      if (
        stockDetails.priceInfo?.lastPrice &&
        stockDetails.securityInfo?.issuedSize
      ) {
        const lastPrice = parseFloat(stockDetails.priceInfo.lastPrice.toString())
        const issuedSize = parseFloat(stockDetails.securityInfo.issuedSize.toString())
        if (!isNaN(lastPrice) && !isNaN(issuedSize)) {
          marketCap = lastPrice * issuedSize // Market Cap = Price × Outstanding Shares
        }
      }

      // Extract 52-week high/low from priceInfo.weekHighLow
      let weekHigh52: number | undefined
      let weekLow52: number | undefined

      if (stockDetails.priceInfo?.weekHighLow) {
        if (stockDetails.priceInfo.weekHighLow.max) {
          weekHigh52 = parseFloat(stockDetails.priceInfo.weekHighLow.max.toString())
        }
        if (stockDetails.priceInfo.weekHighLow.min) {
          weekLow52 = parseFloat(stockDetails.priceInfo.weekHighLow.min.toString())
        }
      }

      // Fallback to intraDayHighLow if weekHighLow not available
      if (!weekHigh52 && stockDetails.priceInfo?.intraDayHighLow?.max) {
        weekHigh52 = parseFloat(stockDetails.priceInfo.intraDayHighLow.max.toString())
      }
      if (!weekLow52 && stockDetails.priceInfo?.intraDayHighLow?.min) {
        weekLow52 = parseFloat(stockDetails.priceInfo.intraDayHighLow.min.toString())
      }

      // Map the response structure to our NSEStockData interface
      return {
        symbol: stockDetails.info.symbol || symbol.toUpperCase(),
        companyName: stockDetails.info.companyName || symbol,
        lastPrice: stockDetails.priceInfo.lastPrice || 0,
        pChange: stockDetails.priceInfo.pChange || 0,
        marketCap: marketCap && !isNaN(marketCap) ? marketCap : undefined,
        pe: peRatio && !isNaN(peRatio) ? peRatio : undefined,
        weekHigh52: weekHigh52 && !isNaN(weekHigh52) ? weekHigh52 : undefined,
        weekLow52: weekLow52 && !isNaN(weekLow52) ? weekLow52 : undefined,
      }
    }
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol} from NSE:`, error)
    // Fallback to dummy data if API fails
    console.log(`Falling back to dummy data for ${symbol}`)
    return getDummyStockData(symbol) || generateMockStockData(symbol)
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
    pChange: parseFloat((Math.random() * 10 - 5).toFixed(2)),
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
 * Get all stock symbols from NSE
 * Returns empty array if using dummy data or if API fails
 */
export async function getAllNSEStockSymbols(): Promise<string[]> {
  if (USE_DUMMY_DATA) {
    console.log("Using dummy data mode - returning dummy stock symbols")
    return []
  }

  try {
    const nseIndia = getNseIndiaInstance()
    if (!nseIndia) {
      console.warn("stock-nse-india package not available")
      return []
    }

    // Check if getAllStockSymbols method exists
    if (typeof nseIndia.getAllStockSymbols === "function") {
      const symbols = await nseIndia.getAllStockSymbols()
      return Array.isArray(symbols) ? symbols.map((s: string) => s.toUpperCase()) : []
    } else {
      console.warn("getAllStockSymbols method not available in stock-nse-india")
      return []
    }
  } catch (error) {
    console.error("Error fetching all NSE stock symbols:", error)
    return []
  }
}

/**
 * Fetch and update multiple stocks with rate limiting
 * Uses dummy data by default (set USE_REAL_API=true to use live API)
 */
export async function fetchAndUpdateStocks(
  symbols: string[],
  options?: {
    batchSize?: number
    delayBetweenBatches?: number
    delayBetweenRequests?: number
  }
) {
  const results = []
  const batchSize = options?.batchSize || 10
  const delayBetweenBatches = options?.delayBetweenBatches || 1000 // 1 second
  const delayBetweenRequests = options?.delayBetweenRequests || 200 // 200ms

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)} (${batch.length} stocks)`)

    for (const symbol of batch) {
      try {
        const stockData = await fetchStockData(symbol)
        
        if (stockData) {
          const updated = await updateStockInDB(stockData)
          results.push({ symbol, success: true, stock: updated })
        } else {
          // Final fallback: generate generic mock data
          const fallbackData = generateMockStockData(symbol)
          const updated = await updateStockInDB(fallbackData)
          results.push({ symbol, success: true, stock: updated, note: "Generated fallback data" })
        }

        // Small delay between requests to avoid rate limiting
        if (delayBetweenRequests > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests))
        }
      } catch (error) {
        console.error(`Error processing stock ${symbol}:`, error)
        results.push({ symbol, success: false, error: String(error) })
      }
    }

    // Delay between batches (except for the last batch)
    if (i + batchSize < symbols.length && delayBetweenBatches > 0) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`)
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
    }
  }

  return results
}

/**
 * Bulk update stocks in database (more efficient for large datasets)
 */
export async function bulkUpdateStocksInDB(stocksData: NSEStockData[]) {
  const results = []

  for (const data of stocksData) {
    try {
      const stock = await updateStockInDB(data)
      results.push({ symbol: data.symbol, success: true, stock })
    } catch (error) {
      console.error(`Error updating stock ${data.symbol}:`, error)
      results.push({ symbol: data.symbol, success: false, error: String(error) })
    }
  }

  return results
}

