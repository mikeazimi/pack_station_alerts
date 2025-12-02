import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Database types for our inventory tables
export interface InventoryRecord {
  id?: number
  sku: string
  inventory_bin: string
  quantity: number
  created_at?: string
}

// Singleton Supabase client
let supabaseClient: SupabaseClient | null = null

/**
 * Get the Supabase client instance
 * Creates a new client if one doesn't exist
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variables")
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  })

  console.log(`[${new Date().toISOString()}] Supabase client initialized`)

  return supabaseClient
}

/**
 * Clear all records from a table
 */
export async function clearTable(tableName: string): Promise<void> {
  const client = getSupabaseClient()

  console.log(`[${new Date().toISOString()}] Clearing table: ${tableName}`)

  const { error } = await client.from(tableName).delete().neq("id", 0)

  if (error) {
    console.error(`[${new Date().toISOString()}] Error clearing table ${tableName}:`, error)
    throw new Error(`Failed to clear table ${tableName}: ${error.message}`)
  }

  console.log(`[${new Date().toISOString()}] Table ${tableName} cleared successfully`)
}

/**
 * Batch insert records into a table
 * Splits large arrays into chunks to avoid hitting API limits
 */
export async function batchInsert(
  tableName: string,
  records: Omit<InventoryRecord, "id" | "created_at">[]
): Promise<number> {
  const client = getSupabaseClient()
  const BATCH_SIZE = 1000 // Supabase recommends batches of 1000 or less

  console.log(`[${new Date().toISOString()}] Inserting ${records.length} records into ${tableName}`)

  let insertedCount = 0

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)

    const { error, count } = await client.from(tableName).insert(batch)

    if (error) {
      console.error(
        `[${new Date().toISOString()}] Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
        error
      )
      throw new Error(`Failed to insert batch into ${tableName}: ${error.message}`)
    }

    insertedCount += batch.length
    console.log(
      `[${new Date().toISOString()}] Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
        `${insertedCount}/${records.length} records`
    )
  }

  console.log(`[${new Date().toISOString()}] Successfully inserted ${insertedCount} records into ${tableName}`)

  return insertedCount
}

/**
 * Query inventory records by bin prefix
 */
export async function queryByPrefix(
  tableName: string,
  prefix: string
): Promise<InventoryRecord[]> {
  const client = getSupabaseClient()

  console.log(`[${new Date().toISOString()}] Querying ${tableName} with prefix: ${prefix}`)

  const { data, error } = await client
    .from(tableName)
    .select("*")
    .ilike("inventory_bin", `${prefix}%`)
    .order("inventory_bin", { ascending: true })

  if (error) {
    console.error(`[${new Date().toISOString()}] Error querying ${tableName}:`, error)
    throw new Error(`Failed to query ${tableName}: ${error.message}`)
  }

  console.log(`[${new Date().toISOString()}] Found ${data?.length || 0} records matching prefix: ${prefix}`)

  return data || []
}

