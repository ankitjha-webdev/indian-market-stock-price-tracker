/**
 * Standalone script to update stocks
 * Can be run manually or via cron: node scripts/update-stocks.js
 */

async function updateStocks() {
  const cronSecret = process.env.CRON_SECRET || "dev-secret"
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  try {
    console.log("Starting stock update...")
    const response = await fetch(`${baseUrl}/api/stocks/update`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (response.ok) {
      console.log("✅ Stock update successful:", data)
    } else {
      console.error("❌ Stock update failed:", data)
      process.exit(1)
    }
  } catch (error) {
    console.error("❌ Error updating stocks:", error)
    process.exit(1)
  }
}

// Export for use in other modules
export { updateStocks }

// Run if executed directly (when compiled to JS)
if (typeof require !== "undefined" && require.main === module) {
  updateStocks()
}

