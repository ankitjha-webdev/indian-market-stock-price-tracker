import { prisma } from "@/lib/prisma"

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
    }
    return nseIndiaInstance
}

export interface FiiDiiData {
    symbol: string
    quarter: string
    quarterEndDate: Date
    fiiHolding: number | null
    diiHolding: number | null
    totalInstitutional: number | null
}

/**
 * Fetch detailed shareholding pattern directly from NSE API
 * This is a fallback method when stock-nse-india package doesn't provide detailed breakdown
 */
async function fetchDetailedShareholdingFromNSE(symbol: string): Promise<any | null> {
    try {
        // NSE's shareholding pattern API endpoint
        // Note: This requires proper headers and cookies that NSE uses for authentication
        const url = `https://www.nseindia.com/api/corporate-shareholding-pattern?index=equities&symbol=${symbol.toUpperCase()}`

        // Try to fetch using fetch API (in Node.js 18+ or with polyfill)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': `https://www.nseindia.com/company-tracking-overview?symbol=${symbol.toUpperCase()}`,
            },
        })

        if (response.ok) {
            const data = await response.json()
            if (data && (data.data || data.shareHoldingPattern)) {
                console.log(`✅ Successfully fetched detailed shareholding from NSE API for ${symbol}`)
                return data
            }
        }
    } catch (error) {
        // NSE API might require cookies/session or have CORS restrictions
        console.log(`Direct NSE API fetch not available:`, error instanceof Error ? error.message : String(error))
    }

    return null
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
 * Get previous quarter
 */
export function getPreviousQuarter(currentQuarter: string): string {
    const [q, year] = currentQuarter.split("-")
    const quarterNum = parseInt(q.replace("Q", ""))
    const yearNum = parseInt(year)

    if (quarterNum === 1) {
        return `Q4-${yearNum - 1}`
    } else {
        return `Q${quarterNum - 1}-${yearNum}`
    }
}

/**
 * Get quarter end date
 */
export function getQuarterEndDate(quarter: string): Date {
    const [q, year] = quarter.split("-")
    const quarterNum = parseInt(q.replace("Q", ""))
    const yearNum = parseInt(year)

    // Q1: Mar 31, Q2: Jun 30, Q3: Sep 30, Q4: Dec 31
    const month = quarterNum * 3 - 1 // 2, 5, 8, 11
    const day = month === 11 ? 31 : [3, 6, 9].includes(month) ? 30 : 31

    return new Date(yearNum, month, day)
}

/**
 * Fetch FII/DII data from NSE using stock-nse-india package or use dummy data
 * NSE provides shareholding pattern data which includes FII/DII holdings
 */
export async function fetchFiiDiiData(symbol: string, quarter?: string): Promise<FiiDiiData | null> {
    const targetQuarter = quarter || getCurrentQuarter()
    const quarterEndDate = getQuarterEndDate(targetQuarter)

    const USE_DUMMY_DATA = process.env.USE_REAL_API !== "true"

    if (USE_DUMMY_DATA) {
        return generateDummyFiiDiiData(symbol, targetQuarter, quarterEndDate)
    }

    // Try to fetch real data from NSE using stock-nse-india package
    try {
        const nseIndia = getNseIndiaInstance()

        if (!nseIndia) {
            console.warn("stock-nse-india package not available, falling back to dummy data")
            return generateDummyFiiDiiData(symbol, targetQuarter, quarterEndDate)
        }

        // Note: getEquityDetails() does NOT include shareholding/FII/DII data
        // The stock-nse-india package's getEquityDetails() only returns:
        // - info, metadata, securityInfo, priceInfo, industryInfo, preOpenMarket
        // It does NOT include shareholding pattern or FII/DII holdings

        // Try to find shareholding data using available methods
        let shareholdingData: any = null

        // Method 1: Try getEquityCorporateInfo() - contains shareholdings_patterns data
        try {
            console.log(`Trying getEquityCorporateInfo() for ${symbol}`)
            const corporateInfo = await nseIndia.getEquityCorporateInfo(symbol.toUpperCase())

            if (corporateInfo) {
                console.log(`Corporate info structure for ${symbol}:`, Object.keys(corporateInfo || {}))

                // Check if corporate info contains shareholding pattern data
                if (corporateInfo.shareholdings_patterns || corporateInfo.shareHoldingPattern ||
                    corporateInfo.shareholdingPattern) {
                    shareholdingData = corporateInfo.shareholdings_patterns ||
                        corporateInfo.shareHoldingPattern ||
                        corporateInfo.shareholdingPattern
                    console.log(`✅ Found shareholding pattern data in corporate info`)
                } else if (corporateInfo.fii || corporateInfo.dii) {
                    shareholdingData = corporateInfo
                    console.log(`✅ Found direct FII/DII data in corporate info`)
                }
            }
        } catch (error) {
            console.log(`getEquityCorporateInfo() failed for ${symbol}:`, error)
        }

        // Method 2: Try getDataByEndpoint() with shareholding pattern endpoint if available
        if (!shareholdingData) {
            try {
                // NSE shareholding pattern endpoint - try different formats
                const shareholdingEndpoints = [
                    { path: "/api/corporate-shareholding-pattern", params: { symbol: symbol.toUpperCase() } },
                    { path: "/api/corporate-shareholding-pattern", params: { index: "equities", symbol: symbol.toUpperCase() } },
                    { path: "/api/shareholding-pattern", params: { symbol: symbol.toUpperCase() } },
                    { path: "/api/corporate-shareholding", params: { symbol: symbol.toUpperCase() } },
                ]

                for (const endpoint of shareholdingEndpoints) {
                    try {
                        console.log(`Trying getDataByEndpoint('${endpoint.path}') for ${symbol}`)
                        const data = await nseIndia.getDataByEndpoint(endpoint.path, endpoint.params)
                        if (data && (data.shareHoldingPattern || data.fii || data.dii || data.data)) {
                            shareholdingData = data
                            console.log(`✅ Found shareholding data via endpoint ${endpoint.path}`)
                            break
                        }
                    } catch (error) {
                        // Continue to next endpoint
                        console.log(`Endpoint ${endpoint.path} failed:`, error)
                    }
                }
            } catch (error) {
                console.log(`getDataByEndpoint() methods failed:`, error)
            }
        }

        // Method 3: Check if corporateInfo has nested detailed shareholding data
        if (shareholdingData && shareholdingData.data) {
            try {
                const corporateInfo = await nseIndia.getEquityCorporateInfo(symbol.toUpperCase())
                if (corporateInfo) {
                    // Check for nested structures or additional properties
                    const allKeys = Object.keys(corporateInfo)
                    console.log(`Full corporate info keys:`, allKeys)

                    // Check if there's a detailed shareholding breakdown somewhere
                    for (const key of allKeys) {
                        const value = corporateInfo[key]
                        if (value && typeof value === 'object' && !Array.isArray(value)) {
                            const nestedKeys = Object.keys(value)
                            if (nestedKeys.some(k => k.toLowerCase().includes('fii') || k.toLowerCase().includes('dii') ||
                                k.toLowerCase().includes('institutional'))) {
                                console.log(`Found potential detailed shareholding in ${key}:`, nestedKeys)
                                // Try to extract from this nested structure
                                if (!shareholdingData.detailed) {
                                    shareholdingData.detailed = value
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                // Ignore errors in this check
            }
        }

        // Log if no shareholding data found
        if (!shareholdingData) {
            console.log(`⚠️ No shareholding/FII/DII data found for ${symbol}`)
            console.log(`📝 Available methods in stock-nse-india:`)
            console.log(`   - getEquityDetails() - Price, P/E, market data (no shareholding)`)
            console.log(`   - getEquityCorporateInfo() - Corporate info (checked, no shareholding)`)
            console.log(`   - getEquityHistoricalData() - Historical prices`)
            console.log(`   - getEquityIntradayData() - Intraday data`)
            console.log(`   - getDataByEndpoint() - Generic endpoint access`)
            console.log(`📝 The stock-nse-india package does not provide FII/DII holdings data.`)
            console.log(`   Using dummy data for development/testing.`)
        }

        // Extract FII/DII data from shareholding pattern
        if (shareholdingData) {
            // Log full structure for debugging (limited to avoid huge logs)
            const dataStr = JSON.stringify(shareholdingData, null, 2)
            console.log(`Shareholding data structure for ${symbol}:`, dataStr.substring(0, 2000))

            // Check if there's a detailed breakdown structure we're missing
            if (shareholdingData.detailed) {
                console.log(`Found detailed shareholding data:`, JSON.stringify(shareholdingData.detailed, null, 2).substring(0, 1000))
                shareholdingData = shareholdingData.detailed
            }

            let fiiHolding: number | null = null
            let diiHolding: number | null = null
            let mappedQuarter: string | null = null // Track the quarter from the data

            // Handle shareholdings_patterns structure from getEquityCorporateInfo()
            // Structure: { data: { "30-Sep-2025": [{ "Category": "value" }, ...] } }
            if (shareholdingData.data && typeof shareholdingData.data === "object") {
                // Get the most recent quarter data
                // Dates are in format "30-Sep-2025", "31-Mar-2025", etc.
                const dates = Object.keys(shareholdingData.data).sort((a, b) => {
                    // Parse dates: "30-Sep-2025" -> "2025-09-30"
                    const parseDate = (dateStr: string) => {
                        const [day, month, year] = dateStr.split("-")
                        const monthMap: { [key: string]: string } = {
                            "jan": "01", "feb": "02", "mar": "03", "apr": "04",
                            "may": "05", "jun": "06", "jul": "07", "aug": "08",
                            "sep": "09", "oct": "10", "nov": "11", "dec": "12"
                        }
                        return new Date(`${year}-${monthMap[month.toLowerCase()]}-${day.padStart(2, "0")}`).getTime()
                    }
                    return parseDate(b) - parseDate(a) // Descending order (most recent first)
                })
                console.log(dates, 'dates-------------------------');

                if (dates.length > 0) {
                    const latestDate = dates[0]
                    const latestData = shareholdingData.data[latestDate]

                    // Map the date to our quarter format
                    // "30-Sep-2025" -> "Q3-2025"
                    const [day, month, year] = latestDate.split("-")
                    const monthMap: { [key: string]: number } = {
                        "jan": 1, "feb": 2, "mar": 3, "apr": 4,
                        "may": 5, "jun": 6, "jul": 7, "aug": 8,
                        "sep": 9, "oct": 10, "nov": 11, "dec": 12
                    }
                    const monthNum = monthMap[month.toLowerCase()] || 1
                    const quarterNum = Math.floor((monthNum - 1) / 3) + 1
                    mappedQuarter = `Q${quarterNum}-${year}`

                    // Use the available quarter data if requested quarter is not available
                    // If the data is for a different quarter, use that quarter instead
                    const quarterToUse = mappedQuarter !== targetQuarter ? mappedQuarter : targetQuarter
                    if (mappedQuarter !== targetQuarter) {
                        console.log(`📅 Shareholding data is for quarter ${mappedQuarter}, but requested ${targetQuarter}. Using available quarter ${mappedQuarter}.`)
                    }

                    console.log(`Processing shareholding data for date: ${latestDate} (Quarter: ${mappedQuarter})`)
                    // FII/DII daily activity endpoint from NSE
                    const fiiDiiEndpoint = '/api/fiidiiTradeRecent';
                    const sss = await nseIndia.getPreOpenMarketData()
                    console.log(JSON.stringify(sss, null, 2), ';;;;;;;;;;;;;;;;;;;;;;;;;;;');

                    if (Array.isArray(latestData)) {
                        // Check if items have nested structure (more detailed breakdown)
                        let hasDetailedBreakdown = false

                        // First pass: look for detailed nested structures
                        for (const item of latestData) {
                            const itemKeys = Object.keys(item)
                            if (itemKeys.length > 0) {
                                const categoryName = itemKeys[0]?.toLowerCase() || ""
                                const value = item[itemKeys[0]]

                                // Check if value is an object (nested structure with detailed breakdown)
                                if (value && typeof value === 'object' && !Array.isArray(value)) {
                                    hasDetailedBreakdown = true
                                    const nestedKeys = Object.keys(value)
                                    console.log(`Found nested structure in ${categoryName}:`, nestedKeys)

                                    // Look for FII/DII in nested structure
                                    for (const nestedKey of nestedKeys) {
                                        const nestedValue = value[nestedKey]
                                        const nestedKeyLower = nestedKey.toLowerCase()
                                        const nestedValueNum = parseFloat(nestedValue?.toString().trim() || "")

                                        if (isNaN(nestedValueNum)) continue

                                        if ((nestedKeyLower.includes("foreign") && nestedKeyLower.includes("institutional")) ||
                                            nestedKeyLower === "fii" || nestedKeyLower.includes("foreign institutional") ||
                                            nestedKeyLower.includes("foreign portfolio") || nestedKeyLower.includes("fpi")) {
                                            fiiHolding = nestedValueNum
                                        } else if ((nestedKeyLower.includes("domestic") && nestedKeyLower.includes("institutional")) ||
                                            nestedKeyLower === "dii" || nestedKeyLower.includes("domestic institutional")) {
                                            diiHolding = nestedValueNum
                                        } else if (nestedKeyLower.includes("mutual fund") || nestedKeyLower.includes("insurance") ||
                                            nestedKeyLower.includes("bank") || nestedKeyLower.includes("financial institution")) {
                                            // These are DII components - accumulate them
                                            diiHolding = (diiHolding || 0) + nestedValueNum
                                        }
                                    }
                                }
                            }
                        }

                        // Second pass: parse flat structure (if no nested structure found)
                        if (!hasDetailedBreakdown) {
                            for (const item of latestData) {
                                // Each item is an object like { "Category Name": "  value" }
                                const categoryName = Object.keys(item)[0]?.toLowerCase() || ""
                                const valueStr = item[Object.keys(item)[0]]?.toString().trim() || ""
                                const value = parseFloat(valueStr)

                                if (isNaN(value)) continue

                                // Check for FII/DII categories with more variations
                                // NSE uses various naming conventions
                                if (categoryName.includes("foreign") && (categoryName.includes("institutional") || categoryName.includes("portfolio"))) {
                                    fiiHolding = value
                                } else if (categoryName.includes("domestic") && categoryName.includes("institutional")) {
                                    diiHolding = value
                                } else if (categoryName === "fii" || categoryName.includes("foreign institutional")) {
                                    fiiHolding = value
                                } else if (categoryName === "dii" || categoryName.includes("domestic institutional")) {
                                    diiHolding = value
                                } else if (categoryName.includes("foreign portfolio investors") || categoryName.includes("fpi") ||
                                    categoryName.includes("foreign portfolio")) {
                                    fiiHolding = value
                                } else if (categoryName.includes("mutual funds") || categoryName.includes("insurance companies") ||
                                    categoryName.includes("banks") || categoryName.includes("financial institutions") ||
                                    categoryName.includes("mutual fund") || categoryName.includes("insurance company")) {
                                    // These are typically part of DII, accumulate them
                                    diiHolding = (diiHolding || 0) + value
                                }
                            }
                        }

                        // If we found data but no explicit FII/DII, log what categories we found
                        if (fiiHolding === null && diiHolding === null) {
                            const categories = latestData.map(item => Object.keys(item)[0]).join(", ")
                            console.log(`⚠️ Shareholding data available but no explicit FII/DII breakdown found. Categories: ${categories}`)
                            console.log(`   Note: "Public" category may include FII/DII but cannot be separated without detailed breakdown.`)

                            // Try to access NSE's detailed shareholding pattern API directly as last resort
                            console.log(`   Attempting to fetch detailed shareholding pattern from NSE API...`)
                            try {
                                const detailedData = await fetchDetailedShareholdingFromNSE(symbol)
                                if (detailedData && detailedData.data) {
                                    // Parse the detailed data structure
                                    const detailedDates = Object.keys(detailedData.data || {}).sort((a, b) => {
                                        const parseDate = (dateStr: string) => {
                                            const [day, month, year] = dateStr.split("-")
                                            const monthMap: { [key: string]: string } = {
                                                "jan": "01", "feb": "02", "mar": "03", "apr": "04",
                                                "may": "05", "jun": "06", "jul": "07", "aug": "08",
                                                "sep": "09", "oct": "10", "nov": "11", "dec": "12"
                                            }
                                            return new Date(`${year}-${monthMap[month.toLowerCase()]}-${day.padStart(2, "0")}`).getTime()
                                        }
                                        return parseDate(b) - parseDate(a)
                                    })

                                    if (detailedDates.length > 0) {
                                        const latestDetailedData = detailedData.data[detailedDates[0]]
                                        if (Array.isArray(latestDetailedData)) {
                                            // Re-parse with detailed data
                                            for (const item of latestDetailedData) {
                                                const categoryName = Object.keys(item)[0]?.toLowerCase() || ""
                                                const valueStr = item[Object.keys(item)[0]]?.toString().trim() || ""
                                                const value = parseFloat(valueStr)

                                                if (isNaN(value)) continue

                                                if ((categoryName.includes("foreign") && (categoryName.includes("institutional") || categoryName.includes("portfolio"))) ||
                                                    categoryName === "fii" || categoryName.includes("fpi")) {
                                                    fiiHolding = value
                                                } else if (categoryName.includes("domestic") && categoryName.includes("institutional") ||
                                                    categoryName === "dii") {
                                                    diiHolding = value
                                                } else if (categoryName.includes("mutual fund") || categoryName.includes("insurance") ||
                                                    categoryName.includes("bank") || categoryName.includes("financial institution")) {
                                                    diiHolding = (diiHolding || 0) + value
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (error) {
                                console.log(`   Direct NSE API fetch failed:`, error)
                            }
                        }
                    }
                }
            }

            // Try different possible data structures (fallback)
            // Direct properties
            if (shareholdingData.fii !== undefined) {
                fiiHolding = typeof shareholdingData.fii === "number"
                    ? shareholdingData.fii
                    : shareholdingData.fii?.holding || shareholdingData.fii?.percentage || shareholdingData.fii?.value || null
            }

            if (shareholdingData.dii !== undefined) {
                diiHolding = typeof shareholdingData.dii === "number"
                    ? shareholdingData.dii
                    : shareholdingData.dii?.holding || shareholdingData.dii?.percentage || shareholdingData.dii?.value || null
            }

            // Named properties (case-insensitive search)
            const lowerKeys = Object.keys(shareholdingData).reduce((acc: any, key) => {
                acc[key.toLowerCase()] = shareholdingData[key]
                return acc
            }, {})

            if (lowerKeys["foreign institutional investors"] !== undefined) {
                const fii = lowerKeys["foreign institutional investors"]
                fiiHolding = typeof fii === "number" ? fii : fii?.holding || fii?.percentage || fii?.value || null
            } else if (lowerKeys["fii"] !== undefined) {
                const fii = lowerKeys["fii"]
                fiiHolding = typeof fii === "number" ? fii : fii?.holding || fii?.percentage || fii?.value || null
            }

            if (lowerKeys["domestic institutional investors"] !== undefined) {
                const dii = lowerKeys["domestic institutional investors"]
                diiHolding = typeof dii === "number" ? dii : dii?.holding || dii?.percentage || dii?.value || null
            } else if (lowerKeys["dii"] !== undefined) {
                const dii = lowerKeys["dii"]
                diiHolding = typeof dii === "number" ? dii : dii?.holding || dii?.percentage || dii?.value || null
            }

            // Array-based structure (common in NSE API)
            if ((fiiHolding === null || diiHolding === null) && Array.isArray(shareholdingData)) {
                for (const item of shareholdingData) {
                    const categoryName = (item.category || item.name || item.type || "").toLowerCase()

                    if ((categoryName.includes("foreign") && categoryName.includes("institutional")) || categoryName === "fii") {
                        fiiHolding = item.holding || item.percentage || item.value || item.percent || null
                    } else if ((categoryName.includes("domestic") && categoryName.includes("institutional")) || categoryName === "dii") {
                        diiHolding = item.holding || item.percentage || item.value || item.percent || null
                    }
                }
            }

            // Check for categories array
            if ((fiiHolding === null || diiHolding === null) && shareholdingData.categories) {
                const categories = Array.isArray(shareholdingData.categories) ? shareholdingData.categories : []

                for (const category of categories) {
                    const categoryName = (category.category || category.name || category.type || "").toLowerCase()

                    if ((categoryName.includes("foreign") && categoryName.includes("institutional")) || categoryName === "fii") {
                        fiiHolding = category.holding || category.percentage || category.value || category.percent || null
                    } else if ((categoryName.includes("domestic") && categoryName.includes("institutional")) || categoryName === "dii") {
                        diiHolding = category.holding || category.percentage || category.value || category.percent || null
                    }
                }
            }

            // Convert to numbers and ensure they're percentages
            if (fiiHolding !== null) {
                fiiHolding = parseFloat(fiiHolding.toString())
                // If value seems to be in decimal form (like 0.25 for 25%), convert to percentage
                if (fiiHolding > 0 && fiiHolding < 1) {
                    fiiHolding = fiiHolding * 100
                }
            }

            if (diiHolding !== null) {
                diiHolding = parseFloat(diiHolding.toString())
                // If value seems to be in decimal form (like 0.25 for 25%), convert to percentage
                if (diiHolding > 0 && diiHolding < 1) {
                    diiHolding = diiHolding * 100
                }
            }

            // Calculate total institutional holding
            const totalInstitutional =
                (fiiHolding !== null || diiHolding !== null)
                    ? (fiiHolding || 0) + (diiHolding || 0)
                    : null

            // Use the mapped quarter if we found data for it
            const finalQuarter = mappedQuarter || targetQuarter
            const finalQuarterEndDate = mappedQuarter ? getQuarterEndDate(mappedQuarter) : quarterEndDate

            if (fiiHolding !== null || diiHolding !== null) {
                console.log(`✅ Successfully fetched FII/DII data for ${symbol}: FII=${fiiHolding}%, DII=${diiHolding}%`)

                return {
                    symbol,
                    quarter: finalQuarter,
                    quarterEndDate: finalQuarterEndDate,
                    fiiHolding: fiiHolding !== null ? parseFloat(fiiHolding.toFixed(2)) : null,
                    diiHolding: diiHolding !== null ? parseFloat(diiHolding.toFixed(2)) : null,
                    totalInstitutional: totalInstitutional !== null ? parseFloat(totalInstitutional.toFixed(2)) : null,
                }
            }
        }

        // If we couldn't extract FII/DII data, log and fall back to dummy
        console.log(`⚠️ Could not fetch FII/DII data from stock-nse-india for ${symbol}`)
        console.log(`📝 Note: The stock-nse-india package's getEquityDetails() does not include shareholding/FII/DII data.`)
        console.log(`📝 To get real FII/DII data, you may need to:`)
        console.log(`   1. Use NSE's official shareholding pattern API directly`)
        console.log(`   2. Use alternative data sources`)
        console.log(`   3. Use dummy data for development/testing (current fallback)`)
        console.log(`Using dummy data for ${symbol}`)
        return generateDummyFiiDiiData(symbol, targetQuarter, quarterEndDate)
    } catch (error) {
        console.error(`❌ Error fetching FII/DII data for ${symbol} from NSE:`, error)
        console.log(`Falling back to dummy data for ${symbol}`)
        return generateDummyFiiDiiData(symbol, targetQuarter, quarterEndDate)
    }
}

/**
 * Generate dummy FII/DII data for testing
 * Some stocks will have significant increases to demonstrate the feature
 */
function generateDummyFiiDiiData(
    symbol: string,
    quarter: string,
    quarterEndDate: Date
): FiiDiiData {
    // Generate realistic FII/DII holdings (typically 10-50% for large caps)
    let baseFii = Math.random() * 30 + 10 // 10-40%
    let baseDii = Math.random() * 25 + 5  // 5-30%

    // Some stocks should have significant increases (for demo purposes)
    // Check if we have previous quarter data to determine if we should simulate a big increase
    const shouldSimulateIncrease = Math.random() > 0.7 // 30% chance of significant increase

    let fiiVariation = (Math.random() - 0.5) * 10 // -5% to +5%
    let diiVariation = (Math.random() - 0.5) * 8   // -4% to +4%

    // If simulating increase, make it more significant
    if (shouldSimulateIncrease) {
        const increaseType = Math.random()
        if (increaseType > 0.5) {
            // FII increase
            fiiVariation = Math.random() * 20 + 10 // 10-30% increase
        } else {
            // DII increase
            diiVariation = Math.random() * 15 + 8 // 8-23% increase
        }
    }

    // Ensure holdings don't exceed 100%
    const fiiHolding = Math.min(parseFloat((baseFii + fiiVariation).toFixed(2)), 100)
    const diiHolding = Math.min(parseFloat((baseDii + diiVariation).toFixed(2)), 100)
    const total = Math.min(parseFloat((fiiHolding + diiHolding).toFixed(2)), 100)

    return {
        symbol,
        quarter,
        quarterEndDate,
        fiiHolding,
        diiHolding,
        totalInstitutional: total,
    }
}

/**
 * Calculate changes in FII/DII holdings compared to previous quarter
 */
export async function calculateFiiDiiChanges(
    stockId: string,
    currentData: FiiDiiData
): Promise<{
    fiiChange: number | null
    diiChange: number | null
    totalChange: number | null
    isSignificant: boolean
}> {
    const previousQuarter = getPreviousQuarter(currentData.quarter)

    // Get previous quarter data
    const previousData = await prisma.fiiDiiHolding.findFirst({
        where: {
            stockId,
            quarter: previousQuarter,
        },
    })

    let fiiChange: number | null = null
    let diiChange: number | null = null
    let totalChange: number | null = null
    let isSignificant = false

    if (previousData) {
        // Calculate percentage changes
        if (previousData.fiiHolding && currentData.fiiHolding !== null) {
            fiiChange = parseFloat(
                (
                    ((currentData.fiiHolding - previousData.fiiHolding) /
                        previousData.fiiHolding) *
                    100
                ).toFixed(2)
            )
        }

        if (previousData.diiHolding && currentData.diiHolding !== null) {
            diiChange = parseFloat(
                (
                    ((currentData.diiHolding - previousData.diiHolding) /
                        previousData.diiHolding) *
                    100
                ).toFixed(2)
            )
        }

        if (previousData.totalInstitutional && currentData.totalInstitutional !== null) {
            totalChange = parseFloat(
                (
                    ((currentData.totalInstitutional - previousData.totalInstitutional) /
                        previousData.totalInstitutional) *
                    100
                ).toFixed(2)
            )
        }

        // Mark as significant if any change is >= 5%
        isSignificant =
            (fiiChange !== null && Math.abs(fiiChange) >= 5) ||
            (diiChange !== null && Math.abs(diiChange) >= 5) ||
            (totalChange !== null && Math.abs(totalChange) >= 5)
    }

    return {
        fiiChange,
        diiChange,
        totalChange,
        isSignificant,
    }
}

/**
 * Save or update FII/DII data for a stock
 */
export async function saveFiiDiiData(
    stockId: string,
    data: FiiDiiData
): Promise<any> {
    // Calculate changes
    const changes = await calculateFiiDiiChanges(stockId, data)

    const previousQuarter = getPreviousQuarter(data.quarter)

    // Upsert FII/DII holding data
    const holding = await prisma.fiiDiiHolding.upsert({
        where: {
            stockId_quarter: {
                stockId,
                quarter: data.quarter,
            },
        },
        update: {
            quarterEndDate: data.quarterEndDate,
            fiiHolding: data.fiiHolding,
            diiHolding: data.diiHolding,
            totalInstitutional: data.totalInstitutional,
            previousQuarter,
            fiiChange: changes.fiiChange,
            diiChange: changes.diiChange,
            totalChange: changes.totalChange,
            isSignificant: changes.isSignificant,
            updatedAt: new Date(),
        },
        create: {
            stockId,
            quarter: data.quarter,
            quarterEndDate: data.quarterEndDate,
            fiiHolding: data.fiiHolding,
            diiHolding: data.diiHolding,
            totalInstitutional: data.totalInstitutional,
            previousQuarter,
            fiiChange: changes.fiiChange,
            diiChange: changes.diiChange,
            totalChange: changes.totalChange,
            isSignificant: changes.isSignificant,
        },
    })

    return holding
}

/**
 * Get stocks with significant FII/DII activity
 * Returns stocks where institutional holdings increased by 5%, 10%, 15%, or more
 */
export async function getStocksWithSignificantFiiDiiActivity(
    minChange: number = 5
): Promise<any[]> {
    const currentQuarter = getCurrentQuarter()

    // Get all holdings with significant changes in current or most recent quarter
    const significantHoldings = await prisma.fiiDiiHolding.findMany({
        where: {
            isSignificant: true,
            OR: [
                {
                    fiiChange: {
                        gte: minChange,
                    },
                },
                {
                    diiChange: {
                        gte: minChange,
                    },
                },
                {
                    totalChange: {
                        gte: minChange,
                    },
                },
            ],
        },
        include: {
            stock: true,
        },
        orderBy: [
            {
                totalChange: "desc",
            },
            {
                fiiChange: "desc",
            },
            {
                diiChange: "desc",
            },
        ],
    })

    // Group by stock and get latest quarter data
    const stockMap = new Map()

    for (const holding of significantHoldings) {
        const stockId = holding.stockId
        const existing = stockMap.get(stockId)

        if (!existing || holding.quarter > existing.quarter) {
            stockMap.set(stockId, {
                ...holding.stock,
                fiiDiiData: holding,
                activityLevel: getActivityLevel(holding),
            })
        }
    }

    return Array.from(stockMap.values())
}

/**
 * Determine activity level based on percentage change
 */
function getActivityLevel(holding: any): {
    level: "high" | "very-high" | "extreme"
    message: string
} {
    const maxChange = Math.max(
        Math.abs(holding.fiiChange || 0),
        Math.abs(holding.diiChange || 0),
        Math.abs(holding.totalChange || 0)
    )

    if (maxChange >= 50) {
        return {
            level: "extreme",
            message: "Institutional holdings doubled or more!",
        }
    } else if (maxChange >= 15) {
        return {
            level: "very-high",
            message: "Very high institutional activity (15%+)",
        }
    } else if (maxChange >= 10) {
        return {
            level: "high",
            message: "High institutional activity (10%+)",
        }
    } else {
        return {
            level: "high",
            message: "Significant institutional activity (5%+)",
        }
    }
}

