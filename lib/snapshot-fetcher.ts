import axios from "axios"
import { getShipHeroAccessToken } from "./shiphero-auth"
import { clearTable, batchInsert, InventoryRecord } from "./supabase-client"
import { getShipHeroCredentials } from "./settings"

// Types
interface SnapshotGenerateResponse {
  data: {
    inventory_generate_snapshot: {
      request_id: string
      complexity: number
      snapshot: {
        snapshot_id: string
        status: string
      }
    }
  }
}

interface SnapshotStatusResponse {
  data: {
    inventory_snapshot: {
      request_id: string
      complexity: number
      snapshot: {
        snapshot_id: string
        status: string
        snapshot_url: string | null
        error: string | null
      }
    }
  }
}

interface SnapshotDataItem {
  sku: string
  inventory_bin: string
  quantity: number
  warehouse_id: string
  [key: string]: unknown
}

// Constants
const TABLE_NAME = "inventory_snapshot_cache"
const POLL_INTERVAL_MS = 20000 // 20 seconds
const MAX_POLL_ATTEMPTS = 30 // Max 10 minutes of polling
const SHIPHERO_API_URL = "https://public-api.shiphero.com/graphql"

/**
 * Generate a new inventory snapshot
 */
async function generateSnapshot(accessToken: string, warehouseId: string): Promise<string> {
  console.log(`[${new Date().toISOString()}] Generating inventory snapshot for warehouse: ${warehouseId}`)

  const mutation = `
    mutation {
      inventory_generate_snapshot(
        data: { warehouse_id: "${warehouseId}" }
      ) {
        request_id
        complexity
        snapshot {
          snapshot_id
          status
        }
      }
    }
  `

  const response = await axios.post<SnapshotGenerateResponse>(
    SHIPHERO_API_URL,
    { query: mutation },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  )

  const snapshotId = response.data?.data?.inventory_generate_snapshot?.snapshot?.snapshot_id

  if (!snapshotId) {
    console.error(`[${new Date().toISOString()}] Snapshot generation response:`, JSON.stringify(response.data))
    throw new Error("Failed to generate snapshot: No snapshot_id returned")
  }

  console.log(`[${new Date().toISOString()}] Snapshot generation initiated. ID: ${snapshotId}`)

  return snapshotId
}

/**
 * Check the status of a snapshot
 */
async function checkSnapshotStatus(
  accessToken: string,
  snapshotId: string
): Promise<{ status: string; url: string | null; error: string | null }> {
  const query = `
    query {
      inventory_snapshot(snapshot_id: "${snapshotId}") {
        request_id
        complexity
        snapshot {
          snapshot_id
          status
          snapshot_url
          error
        }
      }
    }
  `

  const response = await axios.post<SnapshotStatusResponse>(
    SHIPHERO_API_URL,
    { query },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  )

  const snapshot = response.data?.data?.inventory_snapshot?.snapshot

  return {
    status: snapshot?.status || "unknown",
    url: snapshot?.snapshot_url || null,
    error: snapshot?.error || null,
  }
}

/**
 * Poll for snapshot completion
 */
async function waitForSnapshot(accessToken: string, snapshotId: string): Promise<string> {
  console.log(`[${new Date().toISOString()}] Waiting for snapshot ${snapshotId} to complete...`)

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    const { status, url, error } = await checkSnapshotStatus(accessToken, snapshotId)

    console.log(
      `[${new Date().toISOString()}] Snapshot status check ${attempt}/${MAX_POLL_ATTEMPTS}: ${status}`
    )

    if (status === "error" || error) {
      throw new Error(`Snapshot failed: ${error || "Unknown error"}`)
    }

    if (status === "success" && url) {
      console.log(`[${new Date().toISOString()}] Snapshot ready! URL: ${url.substring(0, 50)}...`)
      return url
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(`Snapshot timed out after ${MAX_POLL_ATTEMPTS} attempts`)
}

/**
 * Download and parse snapshot data
 */
async function downloadSnapshotData(url: string): Promise<SnapshotDataItem[]> {
  console.log(`[${new Date().toISOString()}] Downloading snapshot data...`)

  const response = await axios.get<SnapshotDataItem[]>(url)

  if (!Array.isArray(response.data)) {
    throw new Error("Invalid snapshot data format: expected array")
  }

  console.log(`[${new Date().toISOString()}] Downloaded ${response.data.length} inventory records`)

  return response.data
}

/**
 * Transform snapshot data to our database schema
 */
function transformSnapshotData(
  data: SnapshotDataItem[]
): Omit<InventoryRecord, "id" | "created_at">[] {
  return data
    .filter((item) => item.inventory_bin && item.sku) // Filter out items without location or SKU
    .map((item) => ({
      sku: item.sku,
      inventory_bin: item.inventory_bin,
      quantity: typeof item.quantity === "number" ? item.quantity : parseInt(String(item.quantity), 10) || 0,
    }))
}

/**
 * Main function to fetch inventory via snapshot method
 */
export async function fetchSnapshotInventory(): Promise<{
  success: boolean
  recordCount: number
  error?: string
}> {
  const startTime = Date.now()
  console.log(`[${new Date().toISOString()}] Starting snapshot inventory fetch...`)

  try {
    // Get warehouse ID from database settings
    const credentials = await getShipHeroCredentials()

    if (!credentials?.warehouseId) {
      throw new Error("ShipHero credentials not configured. Please enter your warehouse ID in Settings.")
    }

    const warehouseId = credentials.warehouseId

    // Get access token
    const accessToken = await getShipHeroAccessToken()

    // Generate snapshot
    const snapshotId = await generateSnapshot(accessToken, warehouseId)

    // Wait for snapshot to complete
    const snapshotUrl = await waitForSnapshot(accessToken, snapshotId)

    // Download snapshot data
    const rawData = await downloadSnapshotData(snapshotUrl)

    // Transform data
    const transformedData = transformSnapshotData(rawData)

    if (transformedData.length === 0) {
      console.log(`[${new Date().toISOString()}] No inventory data to insert`)
      return { success: true, recordCount: 0 }
    }

    // Clear existing data and insert new data
    await clearTable(TABLE_NAME)
    const insertedCount = await batchInsert(TABLE_NAME, transformedData)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(
      `[${new Date().toISOString()}] Snapshot inventory fetch completed. ` +
        `Records: ${insertedCount}, Duration: ${duration}s`
    )

    return { success: true, recordCount: insertedCount }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`[${new Date().toISOString()}] Snapshot inventory fetch failed:`, errorMessage)
    return { success: false, recordCount: 0, error: errorMessage }
  }
}

