"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { InventoryGrid } from "@/components/inventory-grid"

// Mock inventory data - In production, this would come from an API/database
const generateMockInventory = () => {
  const prefixes = ["PS01", "PS02", "PS03", "RS01", "RS02"]
  const inventory = []

  for (const prefix of prefixes) {
    for (let i = 1; i <= 15; i++) {
      inventory.push({
        location: `${prefix}-${i.toString().padStart(2, "0")}`,
        sku: `SKU-${Math.floor(Math.random() * 900) + 100}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        quantity: Math.floor(Math.random() * 50),
      })
    }
  }

  return inventory
}

export default function InventoryDashboard() {
  const [prefix, setPrefix] = useState("")
  const [inventory] = useState(generateMockInventory())

  // Filter inventory based on prefix in real-time
  const filteredInventory = useMemo(() => {
    if (!prefix.trim()) {
      return inventory
    }
    return inventory.filter((item) => item.location.toUpperCase().startsWith(prefix.toUpperCase()))
  }, [prefix, inventory])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1800px] px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Real-Time Inventory Dashboard</h1>
          <p className="text-muted-foreground">Monitor warehouse bin locations and stock levels</p>
        </div>

        {/* Filter Input */}
        <div className="mb-8 max-w-md">
          <label htmlFor="prefix-filter" className="block text-sm font-medium text-foreground mb-2">
            Filter by Location Prefix
          </label>
          <Input
            id="prefix-filter"
            type="text"
            placeholder="e.g., PS01, RS02..."
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="text-base"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Showing {filteredInventory.length} location{filteredInventory.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Inventory Grid */}
        <InventoryGrid items={filteredInventory} />
      </div>
    </div>
  )
}
