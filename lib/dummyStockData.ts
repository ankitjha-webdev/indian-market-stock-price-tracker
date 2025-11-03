/**
 * Dummy stock data for popular Indian stocks
 * Easy to replace with real API calls by changing USE_DUMMY_DATA flag
 */

export interface DummyStockData {
  symbol: string
  companyName: string
  lastPrice: number
  pChange: number
  marketCap: number
  pe: number
  weekHigh52: number
  weekLow52: number
}

/**
 * Realistic dummy data for popular NSE stocks
 * Prices are based on approximate real values but will vary
 */
export const DUMMY_STOCKS: Record<string, DummyStockData> = {
  RELIANCE: {
    symbol: "RELIANCE",
    companyName: "Reliance Industries Ltd",
    lastPrice: 2450.50,
    pChange: 1.25,
    marketCap: 16570000, // in crores
    pe: 28.5,
    weekHigh52: 2750.00,
    weekLow52: 2200.00,
  },
  TCS: {
    symbol: "TCS",
    companyName: "Tata Consultancy Services Ltd",
    lastPrice: 3450.75,
    pChange: -0.75,
    marketCap: 12700000,
    pe: 32.8,
    weekHigh52: 3800.00,
    weekLow52: 3100.00,
  },
  HDFCBANK: {
    symbol: "HDFCBANK",
    companyName: "HDFC Bank Ltd",
    lastPrice: 1625.30,
    pChange: 0.95,
    marketCap: 12150000,
    pe: 18.2,
    weekHigh52: 1800.00,
    weekLow52: 1400.00,
  },
  INFY: {
    symbol: "INFY",
    companyName: "Infosys Ltd",
    lastPrice: 1450.20,
    pChange: -1.20,
    marketCap: 6050000,
    pe: 26.5,
    weekHigh52: 1650.00,
    weekLow52: 1200.00,
  },
  HINDUNILVR: {
    symbol: "HINDUNILVR",
    companyName: "Hindustan Unilever Ltd",
    lastPrice: 2650.80,
    pChange: 0.50,
    marketCap: 6250000,
    pe: 58.3,
    weekHigh52: 2800.00,
    weekLow52: 2400.00,
  },
  ICICIBANK: {
    symbol: "ICICIBANK",
    companyName: "ICICI Bank Ltd",
    lastPrice: 980.45,
    pChange: 1.80,
    marketCap: 6950000,
    pe: 16.8,
    weekHigh52: 1100.00,
    weekLow52: 850.00,
  },
  BHARTIARTL: {
    symbol: "BHARTIARTL",
    companyName: "Bharti Airtel Ltd",
    lastPrice: 1120.25,
    pChange: 2.15,
    marketCap: 6250000,
    pe: 45.2,
    weekHigh52: 1250.00,
    weekLow52: 900.00,
  },
  SBIN: {
    symbol: "SBIN",
    companyName: "State Bank of India",
    lastPrice: 625.50,
    pChange: 0.35,
    marketCap: 5550000,
    pe: 9.5,
    weekHigh52: 680.00,
    weekLow52: 550.00,
  },
  BAJFINANCE: {
    symbol: "BAJFINANCE",
    companyName: "Bajaj Finance Ltd",
    lastPrice: 6850.00,
    pChange: -0.85,
    marketCap: 4250000,
    pe: 32.5,
    weekHigh52: 7800.00,
    weekLow52: 6200.00,
  },
  ITC: {
    symbol: "ITC",
    companyName: "ITC Ltd",
    lastPrice: 450.75,
    pChange: 0.25,
    marketCap: 5600000,
    pe: 22.8,
    weekHigh52: 500.00,
    weekLow52: 400.00,
  },
  WIPRO: {
    symbol: "WIPRO",
    companyName: "Wipro Ltd",
    lastPrice: 425.30,
    pChange: -1.50,
    marketCap: 2320000,
    pe: 19.5,
    weekHigh52: 480.00,
    weekLow52: 380.00,
  },
  LT: {
    symbol: "LT",
    companyName: "Larsen & Toubro Ltd",
    lastPrice: 3250.50,
    pChange: 1.65,
    marketCap: 4550000,
    pe: 38.2,
    weekHigh52: 3650.00,
    weekLow52: 2800.00,
  },
  AXISBANK: {
    symbol: "AXISBANK",
    companyName: "Axis Bank Ltd",
    lastPrice: 1120.00,
    pChange: 0.90,
    marketCap: 3450000,
    pe: 14.5,
    weekHigh52: 1250.00,
    weekLow52: 950.00,
  },
  MARUTI: {
    symbol: "MARUTI",
    companyName: "Maruti Suzuki India Ltd",
    lastPrice: 9850.75,
    pChange: -0.45,
    marketCap: 2950000,
    pe: 28.5,
    weekHigh52: 11000.00,
    weekLow52: 8500.00,
  },
  SUNPHARMA: {
    symbol: "SUNPHARMA",
    companyName: "Sun Pharmaceutical Industries Ltd",
    lastPrice: 1250.50,
    pChange: 1.15,
    marketCap: 3000000,
    pe: 35.8,
    weekHigh52: 1400.00,
    weekLow52: 1100.00,
  },
  NTPC: {
    symbol: "NTPC",
    companyName: "NTPC Ltd",
    lastPrice: 285.25,
    pChange: 0.75,
    marketCap: 2760000,
    pe: 12.5,
    weekHigh52: 320.00,
    weekLow52: 250.00,
  },
  POWERGRID: {
    symbol: "POWERGRID",
    companyName: "Power Grid Corporation of India Ltd",
    lastPrice: 235.50,
    pChange: 0.40,
    marketCap: 2200000,
    pe: 10.8,
    weekHigh52: 265.00,
    weekLow52: 200.00,
  },
  TITAN: {
    symbol: "TITAN",
    companyName: "Titan Company Ltd",
    lastPrice: 3450.00,
    pChange: 1.85,
    marketCap: 3050000,
    pe: 75.2,
    weekHigh52: 3800.00,
    weekLow52: 3000.00,
  },
  ULTRACEMCO: {
    symbol: "ULTRACEMCO",
    companyName: "UltraTech Cement Ltd",
    lastPrice: 9850.50,
    pChange: 0.65,
    marketCap: 2850000,
    pe: 42.5,
    weekHigh52: 10800.00,
    weekLow52: 8500.00,
  },
  ASIANPAINT: {
    symbol: "ASIANPAINT",
    companyName: "Asian Paints Ltd",
    lastPrice: 3250.75,
    pChange: -0.25,
    marketCap: 3120000,
    pe: 68.5,
    weekHigh52: 3600.00,
    weekLow52: 2900.00,
  },
}

/**
 * Get dummy stock data with slight price variations to simulate real-time updates
 */
export function getDummyStockData(symbol: string): DummyStockData | null {
  const stock = DUMMY_STOCKS[symbol.toUpperCase()]
  if (!stock) {
    return null
  }

  // Add slight random variations to price (±2%) to simulate real-time updates
  const priceVariation = stock.lastPrice * (Math.random() * 0.04 - 0.02) // ±2%
  const newPrice = stock.lastPrice + priceVariation

  // Update P/E slightly based on price change
  const peVariation = (priceVariation / stock.lastPrice) * stock.pe
  const newPe = stock.pe + peVariation

  return {
    ...stock,
    lastPrice: parseFloat(newPrice.toFixed(2)),
    pe: parseFloat(newPe.toFixed(2)),
    pChange: parseFloat((priceVariation / stock.lastPrice * 100).toFixed(2)),
  }
}

/**
 * Get list of all available dummy stock symbols
 */
export function getAvailableDummyStockSymbols(): string[] {
  return Object.keys(DUMMY_STOCKS)
}

/**
 * Get popular stocks list (default set)
 */
export function getPopularStockSymbols(): string[] {
  return [
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
  ]
}

