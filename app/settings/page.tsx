"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your stock tracking preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Update Schedule</CardTitle>
          <CardDescription>
            Stock prices are automatically updated daily at 9:00 AM IST via cron job
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The cron job runs at: <code className="bg-muted px-2 py-1 rounded">0 9 * * *</code> (9:00 AM IST)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Undervalued Stock Criteria</CardTitle>
          <CardDescription>
            Stocks are marked as undervalued based on multiple factors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>P/E Ratio below 15 (Low P/E stocks)</li>
            <li>Price significantly below 52-week high (&gt;20% discount)</li>
            <li>Healthy distance from 52-week low (not distressed)</li>
            <li>Market cap considerations (small caps may be undervalued)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Configure your stock data API endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Set <code className="bg-muted px-2 py-1 rounded">NSE_API_URL</code> in your
            environment variables to connect to a stock data provider.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

