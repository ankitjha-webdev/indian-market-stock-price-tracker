"use client"

import { useEffect, useState } from "react"
import { FiiDiiCard } from "@/components/FiiDiiCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, TrendingUp, Users, Filter } from "lucide-react"
import axios from "axios"

interface FiiDiiStock {
  id: string
  symbol: string
  name: string
  currentPrice: number
  fiiDiiData: {
    quarter: string
    fiiHolding: number | null
    diiHolding: number | null
    totalInstitutional: number | null
    fiiChange: number | null
    diiChange: number | null
    totalChange: number | null
  }
  activityLevel?: {
    level: "high" | "very-high" | "extreme"
    message: string
  }
}

export default function FiiDiiPage() {
  const [stocks, setStocks] = useState<FiiDiiStock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [minChange, setMinChange] = useState(5)
  const [filter, setFilter] = useState<"all" | "extreme" | "very-high" | "high">("all")

  const fetchSignificantStocks = async () => {
    try {
      const response = await axios.get(
        `/api/stocks/fii-dii/significant?minChange=${minChange}`
      )
      if (response.data.success) {
        setStocks(response.data.stocks || [])
      }
    } catch (error) {
      console.error("Error fetching FII/DII stocks:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSignificantStocks()
  }, [minChange])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSignificantStocks()
  }

  const filteredStocks =
    filter === "all"
      ? stocks
      : stocks.filter((s) => s.activityLevel?.level === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            FII/DII Activity Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Track stocks where institutional holdings (FII/DII) have significantly increased
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter stocks by activity level and minimum change</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Minimum Change: {minChange}%
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={minChange}
              onChange={(e) => setMinChange(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5%</span>
              <span>10%</span>
              <span>15%</span>
              <span>20%</span>
              <span>50%</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              size="sm"
            >
              All ({stocks.length})
            </Button>
            <Button
              variant={filter === "extreme" ? "default" : "outline"}
              onClick={() => setFilter("extreme")}
              size="sm"
            >
              🔥 Extreme ({stocks.filter((s) => s.activityLevel?.level === "extreme").length})
            </Button>
            <Button
              variant={filter === "very-high" ? "default" : "outline"}
              onClick={() => setFilter("very-high")}
              size="sm"
            >
              Very High ({stocks.filter((s) => s.activityLevel?.level === "very-high").length})
            </Button>
            <Button
              variant={filter === "high" ? "default" : "outline"}
              onClick={() => setFilter("high")}
              size="sm"
            >
              High ({stocks.filter((s) => s.activityLevel?.level === "high").length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading FII/DII activity...</p>
          </div>
        </div>
      ) : filteredStocks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No stocks found with significant FII/DII activity (≥{minChange}% change).
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting the minimum change filter or refresh to update data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Stocks with Significant Activity ({filteredStocks.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStocks.map((stock) => (
              <FiiDiiCard
                key={stock.id}
                symbol={stock.symbol}
                name={stock.name}
                currentPrice={stock.currentPrice}
                fiiHolding={stock.fiiDiiData.fiiHolding}
                diiHolding={stock.fiiDiiData.diiHolding}
                totalInstitutional={stock.fiiDiiData.totalInstitutional}
                fiiChange={stock.fiiDiiData.fiiChange}
                diiChange={stock.fiiDiiData.diiChange}
                totalChange={stock.fiiDiiData.totalChange}
                quarter={stock.fiiDiiData.quarter}
                activityLevel={stock.activityLevel}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

