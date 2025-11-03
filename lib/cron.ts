import cron from "node-cron"

/**
 * Setup cron job to update stocks daily at 9:00 AM IST
 * Note: Cron time is in UTC, so 9:00 AM IST = 3:30 AM UTC
 * Format: minute hour day month weekday
 */
export function setupStockUpdateCron() {
  // Run at 9:00 AM IST (3:30 AM UTC)
  // If running locally, you might want to adjust this
  cron.schedule("30 3 * * *", async () => {
    console.log("Running scheduled stock update at", new Date().toISOString())
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/stocks/update`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.CRON_SECRET || "dev-secret"}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Stock update completed:", data)
      } else {
        console.error("Stock update failed:", response.statusText)
      }
    } catch (error) {
      console.error("Error in cron job:", error)
    }
  })

  console.log("Stock update cron job scheduled (9:00 AM IST daily)")
}

