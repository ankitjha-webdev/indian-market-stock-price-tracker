import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/Navbar"
import { ThemeToggle } from "@/components/ThemeToggle"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Stock Value Tracker - Indian Market",
  description: "Track and discover undervalued Indian stocks (NSE/BSE)",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  )
}

