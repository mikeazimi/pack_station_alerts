"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Package } from "lucide-react"

interface InventoryCellProps {
  location: string
  sku: string
  quantity: number
}

export function InventoryCell({ location, sku, quantity }: InventoryCellProps) {
  const isLowStock = quantity < 5

  return (
    <Card className={cn("relative p-4 transition-all", isLowStock && "animate-flash-border")}>
      {/* Location Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
        <Package className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-mono font-semibold text-foreground">{location}</h3>
      </div>

      {/* SKU */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground mb-1">SKU</p>
        <p className="font-mono text-sm text-foreground">{sku}</p>
      </div>

      {/* Quantity */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Quantity</p>
        <p className={cn("font-mono text-2xl font-bold", isLowStock ? "text-destructive" : "text-chart-2")}>
          {quantity}
        </p>
        {isLowStock && <p className="text-xs text-destructive mt-1 font-medium">Low Stock Alert</p>}
      </div>
    </Card>
  )
}
