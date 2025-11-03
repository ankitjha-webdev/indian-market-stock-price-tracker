"use client"

import { useEffect, useState } from "react"
import { StockCard } from "@/components/StockCard"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import axios from "axios"

interface Stock {
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
  updatedAt: string
}

export default function DashboardPage() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<"all" | "tracked" | "undervalued">("all")

  const fetchStocks = async () => {
    try {
      let url = "/api/stocks"
      if (filter === "tracked") {
        url += "?tracked=true"
      } else if (filter === "undervalued") {
        url += "?undervalued=true"
      }

      const response = await axios.get(url)
      if (response.data.success) {
        setStocks(response.data.stocks)
      }
    } catch (error) {
      console.error("Error fetching stocks:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStocks()
  }, [filter])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // Trigger update for tracked stocks
      await axios.post("/api/stocks/update")
      await fetchStocks()
    } catch (error) {
      console.error("Error refreshing stocks:", error)
      setRefreshing(false)
    }
  }

  const handleTrackChange = (id: string, isTracked: boolean) => {
    setStocks((prev) =>
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
          <p className="text-muted-foreground">Loading stocks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track and monitor Indian stock prices
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All Stocks
        </Button>
        <Button
          variant={filter === "tracked" ? "default" : "outline"}
          onClick={() => setFilter("tracked")}
        >
          Tracked
        </Button>
        <Button
          variant={filter === "undervalued" ? "default" : "outline"}
          onClick={() => setFilter("undervalued")}
        >
          Undervalued
        </Button>
      </div>

      {stocks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No stocks found. Try refreshing or add some stocks to track.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocks.map((stock) => (
            <StockCard
              key={stock.id}
              {...stock}
              onTrackChange={handleTrackChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

