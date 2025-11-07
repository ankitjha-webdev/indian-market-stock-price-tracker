"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Users } from "lucide-react"

interface FiiDiiCardProps {
  symbol: string
  name: string
  currentPrice: number
  fiiHolding: number | null
  diiHolding: number | null
  totalInstitutional: number | null
  fiiChange: number | null
  diiChange: number | null
  totalChange: number | null
  quarter: string
  activityLevel?: {
    level: "high" | "very-high" | "extreme"
    message: string
  }
}

export function FiiDiiCard({
  symbol,
  name,
  currentPrice,
  fiiHolding,
  diiHolding,
  totalInstitutional,
  fiiChange,
  diiChange,
  totalChange,
  quarter,
  activityLevel,
}: FiiDiiCardProps) {
  const getChangeColor = (change: number | null) => {
    if (change === null) return "text-muted-foreground"
    if (change >= 15) return "text-green-600 dark:text-green-400 font-bold"
    if (change >= 10) return "text-green-500 dark:text-green-400"
    if (change >= 5) return "text-green-400"
    if (change <= -15) return "text-red-600 dark:text-red-400 font-bold"
    if (change <= -10) return "text-red-500 dark:text-red-400"
    if (change <= -5) return "text-red-400"
    return "text-muted-foreground"
  }

  const getChangeBadgeVariant = (change: number | null) => {
    if (change === null) return "outline"
    if (change >= 15) return "success"
    if (change >= 10) return "success"
    if (change >= 5) return "success"
    return "outline"
  }

  const getActivityBadgeVariant = () => {
    if (activityLevel?.level === "extreme") return "success"
    if (activityLevel?.level === "very-high") return "success"
    return "warning"
  }

  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{symbol}</CardTitle>
            <CardDescription className="mt-1">{name}</CardDescription>
          </div>
          {activityLevel && (
            <Badge variant={getActivityBadgeVariant()} className="ml-2">
              {activityLevel.level === "extreme" && "🔥 "}
              {activityLevel.message}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <span className="text-lg font-semibold">₹{currentPrice.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">FII Holding</span>
              </div>
              <p className="text-xl font-bold">
                {fiiHolding !== null ? `${fiiHolding.toFixed(2)}%` : "N/A"}
              </p>
              {fiiChange !== null && (
                <div className="flex items-center gap-1 mt-1">
                  {fiiChange >= 0 ? (
                    <TrendingUp className={`h-3 w-3 ${getChangeColor(fiiChange)}`} />
                  ) : (
                    <TrendingDown className={`h-3 w-3 ${getChangeColor(fiiChange)}`} />
                  )}
                  <Badge variant={getChangeBadgeVariant(fiiChange)} className="text-xs">
                    {fiiChange >= 0 ? "+" : ""}
                    {fiiChange.toFixed(2)}%
                  </Badge>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">DII Holding</span>
              </div>
              <p className="text-xl font-bold">
                {diiHolding !== null ? `${diiHolding.toFixed(2)}%` : "N/A"}
              </p>
              {diiChange !== null && (
                <div className="flex items-center gap-1 mt-1">
                  {diiChange >= 0 ? (
                    <TrendingUp className={`h-3 w-3 ${getChangeColor(diiChange)}`} />
                  ) : (
                    <TrendingDown className={`h-3 w-3 ${getChangeColor(diiChange)}`} />
                  )}
                  <Badge variant={getChangeBadgeVariant(diiChange)} className="text-xs">
                    {diiChange >= 0 ? "+" : ""}
                    {diiChange.toFixed(2)}%
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Total Institutional</span>
              <span className="text-lg font-bold">
                {totalInstitutional !== null
                  ? `${totalInstitutional.toFixed(2)}%`
                  : "N/A"}
              </span>
            </div>
            {totalChange !== null && (
              <div className="flex items-center gap-2">
                {totalChange >= 0 ? (
                  <TrendingUp className={`h-4 w-4 ${getChangeColor(totalChange)}`} />
                ) : (
                  <TrendingDown className={`h-4 w-4 ${getChangeColor(totalChange)}`} />
                )}
                <Badge variant={getChangeBadgeVariant(totalChange)}>
                  {totalChange >= 0 ? "+" : ""}
                  {totalChange.toFixed(2)}% vs previous quarter
                </Badge>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Quarter: {quarter}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

