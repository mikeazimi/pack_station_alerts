"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { InventoryGrid } from "@/components/inventory-grid"
import { Navigation } from "@/components/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { Loader2, AlertCircle } from "lucide-react"

interface InventoryItem {
  location: string
  sku: string
  quantity: number
}

interface InventoryDashboardProps {
  apiEndpoint: "snapshot" | "query"
}

export function InventoryDashboard({ apiEndpoint }: InventoryDashboardProps) {
  const [prefix, setPrefix] = useState("")
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Debounce the prefix input by 300ms
  const debouncedPrefix = useDebounce(prefix, 300)

  const fetchInventory = useCallback(async (searchPrefix: string) => {
    if (!searchPrefix.trim()) {
      setInventory([])
      setError(null)
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch(
        `/api/inventory/${apiEndpoint}?prefix=${encodeURIComponent(searchPrefix.trim())}`
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data: InventoryItem[] = await response.json()
      setInventory(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch inventory data"
      setError(errorMessage)
      setInventory([])
    } finally {
      setIsLoading(false)
    }
  }, [apiEndpoint])

  // Fetch inventory when debounced prefix changes
  useEffect(() => {
    fetchInventory(debouncedPrefix)
  }, [debouncedPrefix, fetchInventory])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1800px] px-6 py-8">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
              Real-Time Inventory Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor warehouse bin locations and stock levels
            </p>
          </div>
          <Navigation />
        </div>

        {/* Current Mode Indicator */}
        <div className="mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            {apiEndpoint === "snapshot" ? "Snapshot Mode" : "Query Mode"}
          </span>
        </div>

        {/* Filter Input */}
        <div className="mb-8 max-w-md">
          <label
            htmlFor="prefix-filter"
            className="block text-sm font-medium text-foreground mb-2"
          >
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
            {isLoading ? (
              "Searching..."
            ) : hasSearched ? (
              `Showing ${inventory.length} location${inventory.length !== 1 ? "s" : ""}`
            ) : (
              "Enter a prefix to search"
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading inventory data...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4 max-w-md text-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground mb-1">
                  Failed to load inventory
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* No Search Yet State */}
        {!hasSearched && !isLoading && !error && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">
                Enter a location prefix to search
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try &quot;PS01&quot;, &quot;RS02&quot;, etc.
              </p>
            </div>
          </div>
        )}

        {/* Inventory Grid */}
        {!isLoading && !error && hasSearched && (
          <InventoryGrid items={inventory} />
        )}
      </div>
    </div>
  )
}

