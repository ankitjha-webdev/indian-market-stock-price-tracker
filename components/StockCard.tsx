"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Star, StarOff, Users } from "lucide-react"
import axios from "axios"

interface StockCardProps {
  id: string
  symbol: string
  name: string
  currentPrice: number
  peRatio: number | null
  weekHigh: number
  weekLow: number
  marketCap: number | null
  isTracked: boolean
  isUndervalued?: boolean
  hasSignificantFiiDii?: boolean // Flag if stock has significant FII/DII activity
  fiiDiiChange?: number | null // FII/DII change percentage
  onTrackChange?: (id: string, isTracked: boolean) => void
}

export function StockCard({
  id,
  symbol,
  name,
  currentPrice,
  peRatio,
  weekHigh,
  weekLow,
  marketCap,
  isTracked,
  isUndervalued = false,
  hasSignificantFiiDii = false,
  fiiDiiChange,
  onTrackChange,
}: StockCardProps) {
  const [tracking, setTracking] = useState(isTracked)
  const [loading, setLoading] = useState(false)

  const priceFromHigh = ((weekHigh - currentPrice) / weekHigh) * 100
  const priceFromLow = ((currentPrice - weekLow) / weekLow) * 100

  const handleTrackToggle = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`/api/stocks/${id}/track`, {
        isTracked: !tracking,
      })

      if (response.data.success) {
        setTracking(!tracking)
        onTrackChange?.(id, !tracking)
      }
    } catch (error) {
      console.error("Error toggling track status:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`
    }
    return `₹${value.toFixed(2)}`
  }

  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{symbol}</CardTitle>
            <CardDescription className="mt-1">{name}</CardDescription>
          </div>
          <div className="flex flex-col gap-1 ml-2">
            {isUndervalued && (
              <Badge variant="success" className="text-xs">
                🔥 Undervalued
              </Badge>
            )}
            {hasSignificantFiiDii && fiiDiiChange !== null && (
              <Badge variant="warning" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                FII/DII +{Math.abs(fiiDiiChange).toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <span className="text-2xl font-bold">₹{currentPrice.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">52W High</span>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="font-medium">₹{weekHigh.toFixed(2)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {priceFromHigh.toFixed(1)}% below
              </span>
            </div>

            <div>
              <span className="text-muted-foreground">52W Low</span>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="font-medium">₹{weekLow.toFixed(2)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {priceFromLow.toFixed(1)}% above
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <span className="text-sm text-muted-foreground">P/E Ratio</span>
              <p className="text-lg font-semibold">
                {peRatio ? peRatio.toFixed(2) : "N/A"}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Market Cap</span>
              <p className="text-lg font-semibold">
                {marketCap ? formatCurrency(marketCap) : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleTrackToggle}
          disabled={loading}
          variant={tracking ? "secondary" : "outline"}
          className="w-full"
        >
          {tracking ? (
            <>
              <StarOff className="mr-2 h-4 w-4" />
              Untrack
            </>
          ) : (
            <>
              <Star className="mr-2 h-4 w-4" />
              Track
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

