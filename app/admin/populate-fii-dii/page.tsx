"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Admin page to trigger population of FII/DII data for all stocks
 */
export default function PopulateFiiDiiPage() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string>("")
  const [result, setResult] = useState<any>(null)
  const [batchSize, setBatchSize] = useState<string>("10")
  const [limit, setLimit] = useState<string>("")

  const handlePopulate = async () => {
    setLoading(true)
    setProgress("Starting to fetch FII/DII data for all stocks...")
    setResult(null)

    try {
      const params = new URLSearchParams()
      params.append("all", "true")
      if (batchSize) params.append("batchSize", batchSize)
      if (limit) params.append("limit", limit)

      const url = `/api/stocks/fii-dii/update?${params.toString()}`
      const response = await fetch(url, { method: "POST" })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setProgress(
          `✅ Successfully processed ${data.summary?.success || 0}/${data.summary?.total || 0} stocks`
        )
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
        <h1 className="text-3xl font-bold mb-2">Populate FII/DII Data</h1>
        <p className="text-muted-foreground">
          Fetch and populate FII/DII (Foreign/Domestic Institutional Investors) data for all stocks
          in the database
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FII/DII Data Population Settings</CardTitle>
          <CardDescription>
            Configure and execute the population of FII/DII data for all stocks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Limit (optional - leave empty to process all stocks)
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="e.g., 50 (for testing)"
              className="w-full px-3 py-2 border rounded-md bg-background"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              ⚠️ Processing all stocks can take a long time. Use limit for testing first.
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
            {loading ? "Processing... Please wait..." : "🚀 Populate FII/DII Data for All Stocks"}
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
                  <p>
                    <strong>Total Stocks:</strong> {result.summary.total}
                  </p>
                  <p>
                    <strong>Processed:</strong> {result.summary.processed}
                  </p>
                  <p>
                    <strong>Success:</strong> {result.summary.success}
                  </p>
                  <p>
                    <strong>Failed:</strong> {result.summary.failed}
                  </p>
                  <p>
                    <strong>Duration:</strong> {result.summary.duration}
                  </p>
                  <p>
                    <strong>Quarter:</strong> {result.quarter}
                  </p>
                </div>
              )}
              {result.error && (
                <div className="text-sm text-destructive">
                  <p>
                    <strong>Error:</strong> {result.error}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm font-medium mb-2">ℹ️ Information:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>This will process all stocks currently in the stock table</li>
              <li>FII/DII data will be fetched using stock-nse-india package (if USE_REAL_API=true)</li>
              <li>Falls back to dummy data if real API is not available</li>
              <li>The process respects rate limits with delays between requests</li>
              <li>Progress is logged to the server console</li>
              <li>Results show the quarter being processed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

