import { NextRequest, NextResponse } from "next/server"
import { getSettings, saveSettings, clearSettings } from "@/lib/settings"

/**
 * GET /api/settings - Retrieve current settings
 */
export async function GET() {
  try {
    const settings = await getSettings()

    if (!settings) {
      return NextResponse.json(
        { configured: false, message: "No settings configured" },
        { status: 200 }
      )
    }

    // Return settings with masked token for security
    return NextResponse.json({
      configured: true,
      warehouse_id: settings.shiphero_warehouse_id,
      // Only show last 4 characters of token for verification
      token_hint: settings.shiphero_refresh_token
        ? `***${settings.shiphero_refresh_token.slice(-4)}`
        : null,
      updated_at: settings.updated_at,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`[${new Date().toISOString()}] GET /api/settings error:`, errorMessage)

    return NextResponse.json(
      { error: "Failed to fetch settings", details: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings - Save new settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { refresh_token, warehouse_id } = body

    // Validate required fields
    if (!refresh_token || typeof refresh_token !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid refresh_token" },
        { status: 400 }
      )
    }

    if (!warehouse_id || typeof warehouse_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid warehouse_id" },
        { status: 400 }
      )
    }

    // Save settings
    await saveSettings({
      shiphero_refresh_token: refresh_token.trim(),
      shiphero_warehouse_id: warehouse_id.trim(),
    })

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`[${new Date().toISOString()}] POST /api/settings error:`, errorMessage)

    return NextResponse.json(
      { error: "Failed to save settings", details: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings - Clear all settings
 */
export async function DELETE() {
  try {
    await clearSettings()

    return NextResponse.json({
      success: true,
      message: "Settings cleared successfully",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`[${new Date().toISOString()}] DELETE /api/settings error:`, errorMessage)

    return NextResponse.json(
      { error: "Failed to clear settings", details: errorMessage },
      { status: 500 }
    )
  }
}

