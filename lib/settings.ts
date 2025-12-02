import { getSupabaseClient } from "./supabase-client"

export interface AppSettings {
  id?: number
  shiphero_refresh_token: string
  shiphero_warehouse_id: string
  updated_at?: string
}

const TABLE_NAME = "app_settings"

/**
 * Get the current app settings from the database
 */
export async function getSettings(): Promise<AppSettings | null> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // No settings found is not an error
    if (error.code === "PGRST116") {
      console.log(`[${new Date().toISOString()}] No settings found in database`)
      return null
    }
    console.error(`[${new Date().toISOString()}] Error fetching settings:`, error)
    throw new Error(`Failed to fetch settings: ${error.message}`)
  }

  return data as AppSettings
}

/**
 * Save app settings to the database
 * This will clear existing settings and insert new ones
 */
export async function saveSettings(settings: Omit<AppSettings, "id" | "updated_at">): Promise<void> {
  const client = getSupabaseClient()

  console.log(`[${new Date().toISOString()}] Saving app settings...`)

  // Clear existing settings
  const { error: deleteError } = await client
    .from(TABLE_NAME)
    .delete()
    .neq("id", 0)

  if (deleteError) {
    console.error(`[${new Date().toISOString()}] Error clearing settings:`, deleteError)
    throw new Error(`Failed to clear settings: ${deleteError.message}`)
  }

  // Insert new settings
  const { error: insertError } = await client
    .from(TABLE_NAME)
    .insert({
      shiphero_refresh_token: settings.shiphero_refresh_token,
      shiphero_warehouse_id: settings.shiphero_warehouse_id,
    })

  if (insertError) {
    console.error(`[${new Date().toISOString()}] Error saving settings:`, insertError)
    throw new Error(`Failed to save settings: ${insertError.message}`)
  }

  console.log(`[${new Date().toISOString()}] Settings saved successfully`)
}

/**
 * Clear all settings from the database
 */
export async function clearSettings(): Promise<void> {
  const client = getSupabaseClient()

  console.log(`[${new Date().toISOString()}] Clearing app settings...`)

  const { error } = await client
    .from(TABLE_NAME)
    .delete()
    .neq("id", 0)

  if (error) {
    console.error(`[${new Date().toISOString()}] Error clearing settings:`, error)
    throw new Error(`Failed to clear settings: ${error.message}`)
  }

  console.log(`[${new Date().toISOString()}] Settings cleared successfully`)
}

/**
 * Get ShipHero credentials from database
 * Returns null if not configured
 */
export async function getShipHeroCredentials(): Promise<{
  refreshToken: string
  warehouseId: string
} | null> {
  const settings = await getSettings()

  if (!settings?.shiphero_refresh_token || !settings?.shiphero_warehouse_id) {
    return null
  }

  return {
    refreshToken: settings.shiphero_refresh_token,
    warehouseId: settings.shiphero_warehouse_id,
  }
}

