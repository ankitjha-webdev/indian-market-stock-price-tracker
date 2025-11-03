"use client"

import { useEffect, useState } from "react"
import { StockCard } from "@/components/StockCard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp } from "lucide-react"
import axios from "axios"

interface UndervaluedStock {
  id: string
  symbol: string
  name: string
  currentPrice: number
  peRatio: number | null
  weekHigh: number
  weekLow: number
  marketCap: number | null
  isTracked: boolean
  isUndervalued: boolean
  undervaluedScore: number
  undervaluedReason: string
}

export default function UndervaluedPage() {
  const [stocks, setStocks] = useState<UndervaluedStock[]>([])
  const [topCandidates, setTopCandidates] = useState<UndervaluedStock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchUndervaluedStocks = async () => {
    try {
      const response = await axios.get("/api/stocks/undervalued")
      if (response.data.success) {
        setStocks(response.data.stocks)
        setTopCandidates(response.data.topBuyCandidates || [])
      }
    } catch (error) {
      console.error("Error fetching undervalued stocks:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchUndervaluedStocks()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // Update stocks first
      await axios.post("/api/stocks/update")
      await fetchUndervaluedStocks()
    } catch (error) {
      console.error("Error refreshing:", error)
      setRefreshing(false)
    }
  }

  const handleTrackChange = (id: string, isTracked: boolean) => {
    setStocks((prev) =>
      prev.map((stock) =>
        stock.id === id ? { ...stock, isTracked } : stock
      )
    )
    setTopCandidates((prev) =>
      prev.map((stock) =>
        stock.id === id ? { ...stock, isTracked } : stock
      )
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading undervalued stocks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Undervalued Stocks
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover stocks that may be trading below their intrinsic value
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {topCandidates.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Top 3 Buy Candidates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {topCandidates.map((stock, index) => (
              <Card key={stock.id} className="border-2 border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="success" className="text-lg">
                      #{index + 1} Buy
                    </Badge>
                    <Badge variant="outline">Score: {stock.undervaluedScore}</Badge>
                  </div>
                  <CardTitle className="text-xl mt-2">{stock.symbol}</CardTitle>
                  <CardDescription>{stock.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-semibold">₹{stock.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">P/E Ratio</span>
                      <span className="font-semibold">
                        {stock.peRatio ? stock.peRatio.toFixed(2) : "N/A"}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {stock.undervaluedReason}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold mb-4">All Undervalued Stocks</h2>
        {stocks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No undervalued stocks found at the moment. Try refreshing to update data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock) => (
              <div key={stock.id} className="relative">
                <StockCard
                  {...stock}
                  isUndervalued={true}
                  onTrackChange={handleTrackChange}
                />
                <Badge
                  variant="outline"
                  className="absolute top-2 right-2 bg-background/80"
                >
                  Score: {stock.undervaluedScore}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

