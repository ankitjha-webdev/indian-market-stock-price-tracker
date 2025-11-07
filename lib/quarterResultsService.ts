import { prisma } from "@/lib/prisma"

// Lazy load stock-nse-india only when real API is needed
let NseIndia: any = null
let nseIndiaInstance: any = null

function getNseIndiaInstance() {
  if (!NseIndia) {
    try {
      NseIndia = require("stock-nse-india").NseIndia
    } catch (error) {
      console.error("Failed to load stock-nse-india package:", error)
      return null
    }
  }
  if (!nseIndiaInstance && NseIndia) {
    nseIndiaInstance = new NseIndia()
  }
  return nseIndiaInstance
}

export interface QuarterResultData {
  stockId: string
  quarter: string
  quarterEndDate: Date
  expectedDate: Date
  actualDate?: Date | null
  isAnnounced?: boolean
  revenue?: number | null
  profit?: number | null
  eps?: number | null
}

export interface NSEQuarterResult {
  symbol: string
  quarter: string
  quarterEndDate: Date
  announcementDate: Date | null
  isAnnounced: boolean
  revenue?: number | null
  profit?: number | null
  eps?: number | null
  corporateAction?: any
}

/**
 * Get current quarter in format "Q1-2025", "Q2-2025", etc.
 */
export function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const year = now.getFullYear()

  // Q1: Jan-Mar (0-2), Q2: Apr-Jun (3-5), Q3: Jul-Sep (6-8), Q4: Oct-Dec (9-11)
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter}-${year}`
}

/**
 * Get next quarter
 */
export function getNextQuarter(currentQuarter: string): string {
  const [q, year] = currentQuarter.split("-")
  const quarterNum = parseInt(q.replace("Q", ""))
  const yearNum = parseInt(year)

  if (quarterNum === 4) {
    return `Q1-${yearNum + 1}`
  } else {
    return `Q${quarterNum + 1}-${yearNum}`
  }
}

/**
 * Get quarter end date
 */
export function getQuarterEndDate(quarter: string): Date {
  const [q, year] = quarter.split("-")
  const quarterNum = parseInt(q.replace("Q", ""))
  const yearNum = parseInt(year)

  // Q1: Mar 31, Q2: Jun 30, Q3: Sep 30, Q4: Dec 31 (following year for Q4)
  let month: number
  let day: number
  let yearForDate: number

  if (quarterNum === 1) {
    month = 2 // March (0-indexed)
    day = 31
    yearForDate = yearNum
  } else if (quarterNum === 2) {
    month = 5 // June (0-indexed)
    day = 30
    yearForDate = yearNum
  } else if (quarterNum === 3) {
    month = 8 // September (0-indexed)
    day = 30
    yearForDate = yearNum
  } else {
    // Q4: Dec 31
    month = 11 // December (0-indexed)
    day = 31
    yearForDate = yearNum
  }

  return new Date(yearForDate, month, day)
}

/**
 * Calculate expected announcement date (45 days after quarter end)
 * In India, companies must announce results within 45 days of quarter end
 */
export function getExpectedAnnouncementDate(quarterEndDate: Date): Date {
  const expectedDate = new Date(quarterEndDate)
  expectedDate.setDate(expectedDate.getDate() + 45)
  return expectedDate
}

/**
 * Get upcoming quarters (current and next)
 */
export function getUpcomingQuarters(count: number = 2): string[] {
  const quarters: string[] = []
  let currentQuarter = getCurrentQuarter()

  for (let i = 0; i < count; i++) {
    quarters.push(currentQuarter)
    currentQuarter = getNextQuarter(currentQuarter)
  }

  return quarters
}

/**
 * Create or update quarter result for a stock
 */
export async function upsertQuarterResult(data: QuarterResultData) {
  return await prisma.quarterResult.upsert({
    where: {
      stockId_quarter: {
        stockId: data.stockId,
        quarter: data.quarter,
      },
    },
    update: {
      quarterEndDate: data.quarterEndDate,
      expectedDate: data.expectedDate,
      actualDate: data.actualDate ?? undefined,
      isAnnounced: data.isAnnounced ?? false,
      revenue: data.revenue ?? undefined,
      profit: data.profit ?? undefined,
      eps: data.eps ?? undefined,
      updatedAt: new Date(),
    },
    create: {
      stockId: data.stockId,
      quarter: data.quarter,
      quarterEndDate: data.quarterEndDate,
      expectedDate: data.expectedDate,
      actualDate: data.actualDate ?? undefined,
      isAnnounced: data.isAnnounced ?? false,
      revenue: data.revenue ?? undefined,
      profit: data.profit ?? undefined,
      eps: data.eps ?? undefined,
    },
  })
}

/**
 * Generate quarter results for all stocks for upcoming quarters
 */
export async function generateQuarterResultsForAllStocks() {
  const stocks = await prisma.stock.findMany({
    select: {
      id: true,
      symbol: true,
    },
  })

  const upcomingQuarters = getUpcomingQuarters(2) // Current and next quarter
  const results = []

  for (const stock of stocks) {
    for (const quarter of upcomingQuarters) {
      const quarterEndDate = getQuarterEndDate(quarter)
      const expectedDate = getExpectedAnnouncementDate(quarterEndDate)

      // Check if already exists
      const existing = await prisma.quarterResult.findUnique({
        where: {
          stockId_quarter: {
            stockId: stock.id,
            quarter,
          },
        },
      })

      // Only create if doesn't exist or if quarter end date has passed
      if (!existing || new Date() > quarterEndDate) {
        try {
          const quarterResult = await upsertQuarterResult({
            stockId: stock.id,
            quarter,
            quarterEndDate,
            expectedDate,
            isAnnounced: false,
          })
          results.push({ stock: stock.symbol, quarter, success: true, quarterResult })
        } catch (error) {
          results.push({ stock: stock.symbol, quarter, success: false, error: String(error) })
        }
      }
    }
  }

  return results
}

/**
 * Fetch quarterly results from NSE for a specific stock
 */
export async function fetchQuarterResultsFromNSE(symbol: string): Promise<NSEQuarterResult | null> {
  const USE_DUMMY_DATA = process.env.USE_REAL_API !== "true"

  if (USE_DUMMY_DATA) {
    console.log(`Using dummy data mode - skipping NSE fetch for ${symbol}`)
    return null
  }

  try {
    const nseIndia = getNseIndiaInstance()

    if (!nseIndia) {
      console.warn("stock-nse-india package not available")
      return null
    }

    const currentQuarter = getCurrentQuarter()
    const quarterEndDate = getQuarterEndDate(currentQuarter)
    const expectedDate = getExpectedAnnouncementDate(quarterEndDate)

    // Try to fetch corporate announcements to find quarterly results
    let announcementDate: Date | null = null
    let isAnnounced = false
    let revenue: number | null = null
    let profit: number | null = null
    let eps: number | null = null

    try {
      // Method 1: Try getEquityCorporateInfo - might have corporate actions/announcements
      const corporateInfo = await nseIndia.getEquityCorporateInfo(symbol.toUpperCase())
      
      if (corporateInfo) {
        // Check for corporate announcements or results
        const announcements = corporateInfo.announcements || 
                             corporateInfo.corporateActions || 
                             corporateInfo.corporate_announcements ||
                             corporateInfo.announcement ||
                             []

        // Search for quarterly results announcements
        for (const announcement of Array.isArray(announcements) ? announcements : []) {
          const subject = (announcement.subject || announcement.title || announcement.name || "").toLowerCase()
          const desc = (announcement.description || announcement.details || "").toLowerCase()
          
          // Check if it's a quarterly result announcement
          if (subject.includes("quarterly") || subject.includes("quarter") || 
              subject.includes("results") || desc.includes("quarterly") ||
              subject.includes("q1") || subject.includes("q2") || 
              subject.includes("q3") || subject.includes("q4")) {
            
            // Try to parse announcement date
            if (announcement.date || announcement.announcementDate || announcement.announcedDate) {
              const dateStr = announcement.date || announcement.announcementDate || announcement.announcedDate
              announcementDate = new Date(dateStr)
              isAnnounced = announcementDate <= new Date()
            }

            // Try to extract financial data from announcement
            if (announcement.revenue || announcement.totalIncome) {
              revenue = parseFloat(announcement.revenue || announcement.totalIncome)
            }
            if (announcement.profit || announcement.netProfit || announcement.pat) {
              profit = parseFloat(announcement.profit || announcement.netProfit || announcement.pat)
            }
            if (announcement.eps || announcement.earningsPerShare) {
              eps = parseFloat(announcement.eps || announcement.earningsPerShare)
            }
            break
          }
        }
      }
    } catch (error) {
      console.log(`Error fetching corporate info for ${symbol}:`, error)
    }

    // Method 2: Try getDataByEndpoint for corporate announcements
    if (!announcementDate) {
      try {
        const endpoints = [
          "/api/corporate-announcements",
          "/api/corporate-announcement",
          "/api/announcements",
          "/api/corporate-actions",
        ]

        for (const endpoint of endpoints) {
          try {
            const data = await nseIndia.getDataByEndpoint(endpoint, { symbol: symbol.toUpperCase() })
            
            if (data && (data.data || data.announcements || Array.isArray(data))) {
              const announcements = data.data || data.announcements || data
              
              for (const announcement of Array.isArray(announcements) ? announcements : []) {
                const subject = (announcement.subject || announcement.title || "").toLowerCase()
                
                if (subject.includes("quarterly") || subject.includes("quarter") || 
                    subject.includes("results")) {
                  if (announcement.date || announcement.announcementDate) {
                    announcementDate = new Date(announcement.date || announcement.announcementDate)
                    isAnnounced = announcementDate <= new Date()
                    break
                  }
                }
              }
              
              if (announcementDate) break
            }
          } catch (error) {
            // Continue to next endpoint
          }
        }
      } catch (error) {
        console.log(`Error fetching announcements via endpoint for ${symbol}:`, error)
      }
    }

    return {
      symbol: symbol.toUpperCase(),
      quarter: currentQuarter,
      quarterEndDate,
      announcementDate: announcementDate || (isAnnounced ? expectedDate : null),
      isAnnounced,
      revenue,
      profit,
      eps,
    }
  } catch (error) {
    console.error(`Error fetching quarter results from NSE for ${symbol}:`, error)
    return null
  }
}

/**
 * Fetch quarterly results from NSE for multiple stocks
 */
export async function fetchQuarterResultsFromNSEForStocks(
  symbols: string[]
): Promise<Map<string, NSEQuarterResult>> {
  const results = new Map<string, NSEQuarterResult>()

  for (const symbol of symbols) {
    try {
      const result = await fetchQuarterResultsFromNSE(symbol)
      if (result) {
        results.set(symbol, result)
      }
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`Error fetching quarter results for ${symbol}:`, error)
    }
  }

  return results
}

/**
 * Get upcoming quarter results
 */
export async function getUpcomingQuarterResults(options?: {
  daysAhead?: number // Number of days to look ahead (default: 60)
  includeAnnounced?: boolean // Include already announced results (default: false)
  limit?: number
  fetchFromNSE?: boolean // Fetch fresh data from NSE (default: false)
}) {
  const daysAhead = options?.daysAhead ?? 60
  const includeAnnounced = options?.includeAnnounced ?? false
  const limit = options?.limit
  const fetchFromNSE = options?.fetchFromNSE ?? false

  // If fetching from NSE, get all stocks first
  if (fetchFromNSE) {
    const stocks = await prisma.stock.findMany({
      select: {
        id: true,
        symbol: true,
      },
      take: limit || 100, // Limit to avoid too many API calls
    })

    const nseResults = await fetchQuarterResultsFromNSEForStocks(
      stocks.map((s: { id: string; symbol: string }) => s.symbol)
    )

    // Update database with fresh NSE data
    for (const stock of stocks) {
      const nseResult = nseResults.get(stock.symbol)
      if (nseResult) {
        const quarterEndDate = getQuarterEndDate(nseResult.quarter)
        const expectedDate = getExpectedAnnouncementDate(quarterEndDate)

        await upsertQuarterResult({
          stockId: stock.id,
          quarter: nseResult.quarter,
          quarterEndDate,
          expectedDate,
          actualDate: nseResult.announcementDate,
          isAnnounced: nseResult.isAnnounced,
          revenue: nseResult.revenue,
          profit: nseResult.profit,
          eps: nseResult.eps,
        })
      }
    }
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead)

  const where: any = {
    expectedDate: {
      lte: cutoffDate,
    },
  }

  // Only show current quarter
  const currentQuarter = getCurrentQuarter()
  where.quarter = currentQuarter

  if (!includeAnnounced) {
    where.isAnnounced = false
  }

  const quarterResults = await prisma.quarterResult.findMany({
    where,
    include: {
      stock: {
        select: {
          id: true,
          symbol: true,
          name: true,
          currentPrice: true,
          peRatio: true,
          marketCap: true,
        },
      },
    },
    orderBy: [
      { expectedDate: "asc" },
      { stock: { symbol: "asc" } },
    ],
    take: limit,
  })

  return quarterResults
}

/**
 * Get quarter results grouped by date
 */
export async function getQuarterResultsGroupedByDate(options?: {
  daysAhead?: number
  includeAnnounced?: boolean
  fetchFromNSE?: boolean
}) {
  const results = await getUpcomingQuarterResults({
    ...options,
    includeAnnounced: true, // Always include announced for current quarter
  })

  // Separate announced and upcoming results
  const announcedResults = results.filter((r: any) => r.isAnnounced)
  const upcomingResults = results.filter((r: any) => !r.isAnnounced)

  // Group announced by actual date
  const announcedGrouped: Record<string, typeof results> = {}
  for (const result of announcedResults) {
    const dateKey = (result.actualDate || result.expectedDate).toISOString().split("T")[0]
    if (!announcedGrouped[dateKey]) {
      announcedGrouped[dateKey] = []
    }
    announcedGrouped[dateKey].push(result)
  }

  // Group upcoming by expected date
  const upcomingGrouped: Record<string, typeof results> = {}
  for (const result of upcomingResults) {
    const dateKey = result.expectedDate.toISOString().split("T")[0]
    if (!upcomingGrouped[dateKey]) {
      upcomingGrouped[dateKey] = []
    }
    upcomingGrouped[dateKey].push(result)
  }

  // Combine and sort
  const announced = Object.entries(announcedGrouped)
    .map(([date, results]) => ({
      date,
      results,
      count: results.length,
      type: "announced" as const,
    }))
    .sort((a, b) => b.date.localeCompare(a.date)) // Most recent first

  const upcoming = Object.entries(upcomingGrouped)
    .map(([date, results]) => ({
      date,
      results,
      count: results.length,
      type: "upcoming" as const,
    }))
    .sort((a, b) => a.date.localeCompare(b.date)) // Earliest first

  return {
    announced,
    upcoming,
    all: [...announced, ...upcoming],
  }
}

/**
 * Mark quarter result as announced
 */
export async function markQuarterResultAnnounced(
  stockId: string,
  quarter: string,
  actualDate?: Date
) {
  return await prisma.quarterResult.update({
    where: {
      stockId_quarter: {
        stockId,
        quarter,
      },
    },
    data: {
      isAnnounced: true,
      actualDate: actualDate ?? new Date(),
      updatedAt: new Date(),
    },
  })
}

