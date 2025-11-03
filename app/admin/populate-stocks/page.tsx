"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Admin page to trigger population of all NSE stocks
 * This provides a UI for the populate-all endpoint
 */
export default function PopulateAllStocksPage() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string>("")
  const [result, setResult] = useState<any>(null)
  const [limit, setLimit] = useState<string>("50")
  const [batchSize, setBatchSize] = useState<string>("10")

  const handlePopulate = async () => {
    setLoading(true)
    setProgress("Starting to fetch all NSE stocks...")
    setResult(null)

    try {
      const params = new URLSearchParams()
      if (limit) params.append("limit", limit)
      if (batchSize) params.append("batchSize", batchSize)

      const url = `/api/stocks/populate-all?${params.toString()}`
      const response = await fetch(url, { method: "POST" })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setProgress(`✅ Successfully processed ${data.summary?.processed || 0} stocks`)
      } else {
        setProgress(`❌ Error: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      setProgress(`❌ Error: ${String(error)}`)
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Populate All NSE Stocks</h1>
        <p className="text-muted-foreground">
          Fetch and populate database with all stocks from National Stock Exchange of India
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Population Settings</CardTitle>
          <CardDescription>
            Configure and execute the population of all NSE stocks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Limit (for testing - leave empty for all stocks)
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="50"
              className="w-full px-3 py-2 border rounded-md bg-background"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              ⚠️ Fetching all NSE stocks can take hours. Use limit for testing.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Batch Size</label>
            <input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              placeholder="10"
              className="w-full px-3 py-2 border rounded-md bg-background"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Number of stocks to process per batch (higher = faster but more risk of rate limiting)
            </p>
          </div>

          <Button onClick={handlePopulate} disabled={loading} className="w-full" size="lg">
            {loading ? "Processing... Please wait..." : "🚀 Populate All NSE Stocks"}
          </Button>

          {progress && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm">{progress}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-muted rounded-md space-y-2">
              <h3 className="font-semibold">Result:</h3>
              {result.summary && (
                <div className="text-sm space-y-1">
                  <p><strong>Total Symbols Found:</strong> {result.summary.totalSymbols}</p>
                  <p><strong>Processed:</strong> {result.summary.processed}</p>
                  <p><strong>Success:</strong> {result.summary.success}</p>
                  <p><strong>Failed:</strong> {result.summary.failed}</p>
                  <p><strong>Duration:</strong> {result.summary.duration}</p>
                  <p><strong>Existing in DB:</strong> {result.summary.existingInDB}</p>
                </div>
              )}
              {result.error && (
                <div className="text-sm text-destructive">
                  <p><strong>Error:</strong> {result.error}</p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm font-medium mb-2">⚠️ Important Notes:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Requires <code className="bg-background px-1 py-0.5 rounded">USE_REAL_API=true</code> in .env</li>
              <li>This operation can take a very long time (hours) for all stocks</li>
              <li>Use the limit parameter to test with a smaller number first (e.g., 50)</li>
              <li>The process respects rate limits with delays between requests</li>
              <li>You can safely refresh the page and check progress in the server logs</li>
              <li>Progress is logged to the server console, not this page</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

