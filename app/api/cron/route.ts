import { NextRequest, NextResponse } from "next/server"
import { setupStockUpdateCron } from "@/lib/cron"

/**
 * POST /api/cron/setup
 * Initialize cron jobs (should be called once on server start)
 * Note: In production, consider using a separate cron service or Vercel Cron
 */
export async function POST(request: NextRequest) {
  try {
    // Verify secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Setup cron (this should ideally be done in a separate process)
    setupStockUpdateCron()

    return NextResponse.json({
      success: true,
      message: "Cron jobs initialized",
    })
  } catch (error) {
    console.error("Error setting up cron:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

