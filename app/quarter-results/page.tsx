"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Calendar, TrendingUp, Clock } from "lucide-react"
import axios from "axios"
import Link from "next/link"

interface QuarterResult {
  id: string
  quarter: string
  quarterEndDate: string
  expectedDate: string
  actualDate: string | null
  isAnnounced: boolean
  revenue: number | null
  profit: number | null
  eps: number | null
  stock: {
    id: string
    symbol: string
    name: string
    currentPrice: number
    peRatio: number | null
    marketCap: number | null
  }
}

interface GroupedResult {
  date: string
  results: QuarterResult[]
  count: number
  isAnnounced?: boolean
}

export default function QuarterResultsPage() {
  const [groupedResults, setGroupedResults] = useState<GroupedResult[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [daysAhead, setDaysAhead] = useState(60)

  const fetchQuarterResults = async (fetchFromNSE = false) => {
    try {
      const url = `/api/stocks/quarter-results?grouped=true&daysAhead=${daysAhead}&includeAnnounced=true${fetchFromNSE ? "&fetchFromNSE=true" : ""}`
      const response = await axios.get(url)
      if (response.data.success) {
        const grouped = response.data.grouped || {}
        // Combine announced and upcoming results
        const allResults = [
          ...(grouped.announced || []).map((g: any) => ({ ...g, isAnnounced: true })),
          ...(grouped.upcoming || []).map((g: any) => ({ ...g, isAnnounced: false })),
        ]
        setGroupedResults(allResults)
      }
    } catch (error) {
      console.error("Error fetching quarter results:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchQuarterResults()
  }, [daysAhead])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchQuarterResults(true) // Fetch from NSE
    } catch (error) {
      console.error("Error refreshing:", error)
      setRefreshing(false)
    }
  }

  const handleGenerateResults = async () => {
    setRefreshing(true)
    try {
      await axios.post("/api/stocks/quarter-results")
      await fetchQuarterResults(true) // Fetch from NSE after generating
    } catch (error) {
      console.error("Error generating results:", error)
      setRefreshing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return "N/A"
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`
    }
    return `₹${value.toFixed(2)}`
  }

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDaysUntilBadgeVariant = (days: number) => {
    if (days <= 7) return "destructive"
    if (days <= 15) return "warning"
    return "secondary"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quarter results...</p>
        </div>
      </div>
    )
  }

  const totalResults = groupedResults.reduce((sum, group) => sum + group.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Current Quarter Results
          </h1>
          <p className="text-muted-foreground mt-1">
            Track current quarter results - announced and upcoming (fetched from NSE)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateResults} disabled={refreshing} variant="outline">
            Generate Results
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Days Ahead:</label>
        <div className="flex gap-2">
          {[30, 60, 90].map((days) => (
            <Button
              key={days}
              variant={daysAhead === days ? "default" : "outline"}
              size="sm"
              onClick={() => setDaysAhead(days)}
            >
              {days} days
            </Button>
          ))}
        </div>
      </div>

      {totalResults === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No quarter results found. Click "Refresh" to fetch from NSE.
            </p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Fetch from NSE
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {totalResults} current quarter result{totalResults !== 1 ? "s" : ""} (announced + upcoming)
            </p>
          </div>

          {groupedResults.map((group) => {
            const isAnnounced = (group as any).isAnnounced
            return (
            <Card key={group.date}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {formatDate(group.date)}
                      {isAnnounced && (
                        <Badge variant="success" className="ml-2">Announced</Badge>
                      )}
                      {!isAnnounced && (
                        <Badge variant="warning" className="ml-2">Upcoming</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {group.count} compan{group.count !== 1 ? "ies" : "y"} {isAnnounced ? "announced" : "announcing"} results
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    {group.count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.results.map((result) => {
                    const announcementDate = result.isAnnounced ? (result.actualDate || result.expectedDate) : result.expectedDate
                    const daysUntil = getDaysUntil(announcementDate)
                    const isUpcoming = !result.isAnnounced && daysUntil >= 0

                    return (
                      <Card key={result.id} className="border">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                <Link
                                  href={`/dashboard?symbol=${result.stock.symbol}`}
                                  className="hover:underline"
                                >
                                  {result.stock.symbol}
                                </Link>
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {result.stock.name}
                              </CardDescription>
                            </div>
                            {result.isAnnounced ? (
                              <Badge variant="success">
                                Announced
                              </Badge>
                            ) : (
                              <Badge variant={getDaysUntilBadgeVariant(daysUntil)}>
                                {isUpcoming ? `In ${daysUntil} days` : `${Math.abs(daysUntil)} days ago`}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Quarter</span>
                              <span className="font-medium">{result.quarter}</span>
                            </div>
                            {result.isAnnounced && result.revenue && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Revenue</span>
                                <span className="font-medium">{formatCurrency(result.revenue)}</span>
                              </div>
                            )}
                            {result.isAnnounced && result.profit !== null && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Profit</span>
                                <span className={`font-medium ${result.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {formatCurrency(result.profit)}
                                </span>
                              </div>
                            )}
                            {result.isAnnounced && result.eps !== null && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">EPS</span>
                                <span className="font-medium">₹{result.eps.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Current Price</span>
                              <span className="font-medium">₹{result.stock.currentPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">P/E Ratio</span>
                              <span className="font-medium">
                                {result.stock.peRatio ? result.stock.peRatio.toFixed(2) : "N/A"}
                              </span>
                            </div>
                            <div className="pt-2 border-t">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{result.isAnnounced ? "Announced" : "Expected"}: {formatDate(announcementDate)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

