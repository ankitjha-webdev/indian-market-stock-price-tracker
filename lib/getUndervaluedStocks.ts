import { prisma } from "@/lib/prisma"

export interface UndervaluedStock {
  id: string
  name: string
  symbol: string
  currentPrice: number
  peRatio: number | null
  weekHigh: number
  weekLow: number
  marketCap: number | null
  isTracked: boolean
  undervaluedScore: number
  undervaluedReason: string
}

/**
 * Calculate if a stock is undervalued based on multiple factors:
 * 1. P/E ratio (lower is better, consider < 15 as undervalued for Indian markets)
 * 2. Price relative to 52-week high (if current price is far below high)
 * 3. Market cap (smaller caps may be undervalued)
 *
 * Returns stocks with an undervalued score (higher = more undervalued)
 */
export async function getUndervaluedStocks(): Promise<UndervaluedStock[]> {
  const stocks = await prisma.stock.findMany({
    where: {
      currentPrice: {
        gt: 0,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  const undervaluedStocks: UndervaluedStock[] = []

  for (const stock of stocks) {
    let score = 0
    const reasons: string[] = []

    // Factor 1: P/E Ratio (lower is better, typical range: 10-25 for Indian stocks)
    if (stock.peRatio && stock.peRatio > 0) {
      if (stock.peRatio < 15) {
        score += 30
        reasons.push("Low P/E ratio")
      } else if (stock.peRatio < 20) {
        score += 15
        reasons.push("Moderate P/E ratio")
      }
    }

    // Factor 2: Price relative to 52-week high
    if (stock.weekHigh > 0 && stock.currentPrice > 0) {
      const priceFromHigh = ((stock.weekHigh - stock.currentPrice) / stock.weekHigh) * 100
      if (priceFromHigh > 30) {
        score += 40
        reasons.push("Far below 52-week high")
      } else if (priceFromHigh > 20) {
        score += 25
        reasons.push("Below 52-week high")
      } else if (priceFromHigh > 10) {
        score += 10
        reasons.push("Moderately below high")
      }
    }

    // Factor 3: Price relative to 52-week low (not too close to low = not distressed)
    if (stock.weekLow > 0 && stock.currentPrice > 0) {
      const priceFromLow = ((stock.currentPrice - stock.weekLow) / stock.weekLow) * 100
      if (priceFromLow > 20 && priceFromLow < 50) {
        score += 20
        reasons.push("Healthy price above low")
      }
    }

    // Factor 4: Market cap (smaller companies might be undervalued)
    // Market cap is stored as actual number (not in crores)
    // 5000 crores = 50,000,000,000 (50 billion)
    if (stock.marketCap) {
      // Less than 5000 crores = small cap
      if (stock.marketCap < 50000000000) {
        score += 10
        reasons.push("Small cap potential")
      }
    }

    // Only include stocks with score >= 30
    if (score >= 30) {
      undervaluedStocks.push({
        ...stock,
        undervaluedScore: score,
        undervaluedReason: reasons.join(", "),
      })
    }
  }

  // Sort by score (highest first)
  undervaluedStocks.sort((a, b) => b.undervaluedScore - a.undervaluedScore)

  // Update isUndervalued flag in database
  const undervaluedIds = undervaluedStocks.map((s) => s.id)
  await prisma.stock.updateMany({
    where: {
      id: {
        in: undervaluedIds,
      },
    },
    data: {
      isUndervalued: true,
    },
  })

  await prisma.stock.updateMany({
    where: {
      id: {
        notIn: undervaluedIds,
      },
    },
    data: {
      isUndervalued: false,
    },
  })

  return undervaluedStocks
}

