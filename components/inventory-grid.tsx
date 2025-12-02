"use client"

import { InventoryCell } from "./inventory-cell"

interface InventoryItem {
  location: string
  sku: string
  quantity: number
}

interface InventoryGridProps {
  items: InventoryItem[]
}

export function InventoryGrid({ items }: InventoryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">No locations found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different prefix filter</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => (
        <InventoryCell key={item.location} location={item.location} sku={item.sku} quantity={item.quantity} />
      ))}
    </div>
  )
}
