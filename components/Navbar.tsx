"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, TrendingDown, Settings, Database, Users, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/undervalued", label: "Undervalued", icon: TrendingDown },
  { href: "/quarter-results", label: "Quarter Results", icon: Calendar },
  { href: "/fii-dii", label: "FII/DII Activity", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin/populate-stocks", label: "Admin", icon: Database },
]

const adminItems = [
  { href: "/admin/populate-stocks", label: "Populate Stocks", icon: Database },
  { href: "/admin/populate-fii-dii", label: "Populate FII/DII", icon: Users },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-primary" />
            <Link href="/dashboard" className="text-xl font-bold">
              Stock Tracker
            </Link>
          </div>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "gap-2",
                      isActive && "bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

