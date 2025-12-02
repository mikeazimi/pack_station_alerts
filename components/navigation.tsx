"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/snapshot", label: "Snapshot" },
  { href: "/query", label: "Query" },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

