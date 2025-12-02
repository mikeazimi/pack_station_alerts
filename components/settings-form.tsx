"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, Save, Trash2, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

interface SettingsState {
  configured: boolean
  warehouse_id?: string
  token_hint?: string
  updated_at?: string
}

export function SettingsForm() {
  const [refreshToken, setRefreshToken] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [currentSettings, setCurrentSettings] = useState<SettingsState | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Fetch current settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings")
      const data = await response.json()
      setCurrentSettings(data)
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!refreshToken.trim() || !warehouseId.trim()) {
      setMessage({ type: "error", text: "Please fill in both fields" })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: refreshToken.trim(),
          warehouse_id: warehouseId.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" })
        setRefreshToken("")
        setWarehouseId("")
        fetchSettings()
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save settings" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all settings? This will stop inventory syncing.")) {
      return
    }

    setIsClearing(true)
    setMessage(null)

    try {
      const response = await fetch("/api/settings", { method: "DELETE" })
      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: "Settings cleared successfully" })
        fetchSettings()
      } else {
        setMessage({ type: "error", text: data.error || "Failed to clear settings" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsClearing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Current Status */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Current Status</h2>
        
        {currentSettings?.configured ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-chart-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Configured</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium">Warehouse ID:</span> {currentSettings.warehouse_id}</p>
              <p><span className="font-medium">Token:</span> {currentSettings.token_hint}</p>
              {currentSettings.updated_at && (
                <p><span className="font-medium">Last Updated:</span> {new Date(currentSettings.updated_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertCircle className="h-5 w-5" />
            <span>Not configured - Enter your credentials below</span>
          </div>
        )}
      </div>

      {/* Settings Form */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {currentSettings?.configured ? "Update Credentials" : "Configure Credentials"}
        </h2>

        <div className="space-y-4">
          {/* Warehouse ID */}
          <div>
            <label htmlFor="warehouse-id" className="block text-sm font-medium text-foreground mb-2">
              ShipHero Warehouse ID
            </label>
            <Input
              id="warehouse-id"
              type="text"
              placeholder="Enter your warehouse ID"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="text-base"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Find this in ShipHero under Settings → Warehouses
            </p>
          </div>

          {/* Refresh Token */}
          <div>
            <label htmlFor="refresh-token" className="block text-sm font-medium text-foreground mb-2">
              ShipHero Refresh Token
            </label>
            <div className="relative">
              <Input
                id="refresh-token"
                type={showToken ? "text" : "password"}
                placeholder="Enter your developer refresh token"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="text-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Get this from ShipHero Developer Portal → My Apps → Your App → Refresh Token
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.type === "success"
                  ? "bg-chart-2/10 text-chart-2 border border-chart-2/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !refreshToken.trim() || !warehouseId.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </button>

            {currentSettings?.configured && (
              <button
                onClick={handleClear}
                disabled={isClearing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-destructive/10 text-destructive font-medium text-sm hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Clear Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="rounded-lg border border-border bg-card/50 p-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">How to get your credentials</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Log into your ShipHero account</li>
          <li>Go to <strong>Settings → Warehouses</strong> to find your Warehouse ID</li>
          <li>Go to <strong>Developer Portal → My Apps</strong></li>
          <li>Select your app (or create one) and copy the Refresh Token</li>
          <li>Enter both values above and click Save</li>
        </ol>
      </div>
    </div>
  )
}

