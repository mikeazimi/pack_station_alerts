import axios from "axios"
import { getShipHeroAccessToken } from "./shiphero-auth"
import { clearTable, batchInsert, InventoryRecord } from "./supabase-client"
import { getShipHeroCredentials } from "./settings"

// Types
interface LocationNode {
  location: {
    name: string
  }
  quantity: number
}

interface ProductNode {
  product: {
    sku: string
  }
  locations: {
    edges: Array<{
      node: LocationNode
    }>
  }
}

interface WarehouseProductsResponse {
  data: {
    warehouse_products: {
      request_id: string
      complexity: number
      data: {
        edges: Array<{
          node: ProductNode
        }>
        pageInfo: {
          hasNextPage: boolean
          endCursor: string | null
        }
      }
    }
  }
  errors?: Array<{ message: string }>
}

// Constants
const TABLE_NAME = "inventory_query_cache"
const SHIPHERO_API_URL = "https://public-api.shiphero.com/graphql"
const PAGE_SIZE = 100 // Number of products per page
const LOCATIONS_PAGE_SIZE = 50 // Number of locations per product
const MAX_PAGES = 1000 // Safety limit to prevent infinite loops

/**
 * Build the GraphQL query for warehouse products
 */
function buildQuery(warehouseId: string, cursor: string | null): string {
  const afterClause = cursor ? `after: "${cursor}"` : ""

  return `
    query {
      warehouse_products(warehouse_id: "${warehouseId}") {
        request_id
        complexity
        data(first: ${PAGE_SIZE}${afterClause ? ", " + afterClause : ""}) {
          edges {
            node {
              product {
                sku
              }
              locations(first: ${LOCATIONS_PAGE_SIZE}) {
                edges {
                  node {
                    location {
                      name
                    }
                    quantity
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `
}

/**
 * Fetch a single page of warehouse products
 */
async function fetchPage(
  accessToken: string,
  warehouseId: string,
  cursor: string | null
): Promise<{
  products: ProductNode[]
  hasNextPage: boolean
  endCursor: string | null
}> {
  const query = buildQuery(warehouseId, cursor)

  const response = await axios.post<WarehouseProductsResponse>(
    SHIPHERO_API_URL,
    { query },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  )

  // Check for GraphQL errors
  if (response.data.errors && response.data.errors.length > 0) {
    const errorMessages = response.data.errors.map((e) => e.message).join(", ")
    throw new Error(`GraphQL errors: ${errorMessages}`)
  }

  const data = response.data?.data?.warehouse_products?.data

  if (!data) {
    throw new Error("Invalid response structure from warehouse_products query")
  }

  const products = data.edges.map((edge) => edge.node)
  const { hasNextPage, endCursor } = data.pageInfo

  return { products, hasNextPage, endCursor }
}

/**
 * Transform product data to inventory records
 * Each product can have multiple locations, so we flatten them
 */
function transformProducts(products: ProductNode[]): Omit<InventoryRecord, "id" | "created_at">[] {
  const records: Omit<InventoryRecord, "id" | "created_at">[] = []

  for (const product of products) {
    const sku = product.product?.sku

    if (!sku) continue

    for (const locationEdge of product.locations?.edges || []) {
      const locationNode = locationEdge.node
      const locationName = locationNode?.location?.name
      const quantity = locationNode?.quantity

      if (locationName && typeof quantity === "number") {
        records.push({
          sku,
          inventory_bin: locationName,
          quantity,
        })
      }
    }
  }

  return records
}

/**
 * Main function to fetch inventory via direct query method
 */
export async function fetchQueryInventory(): Promise<{
  success: boolean
  recordCount: number
  error?: string
}> {
  const startTime = Date.now()
  console.log(`[${new Date().toISOString()}] Starting query inventory fetch...`)

  try {
    // Get warehouse ID from database settings
    const credentials = await getShipHeroCredentials()

    if (!credentials?.warehouseId) {
      throw new Error("ShipHero credentials not configured. Please enter your warehouse ID in Settings.")
    }

    const warehouseId = credentials.warehouseId

    // Get access token
    const accessToken = await getShipHeroAccessToken()

    // Fetch all pages
    const allRecords: Omit<InventoryRecord, "id" | "created_at">[] = []
    let cursor: string | null = null
    let pageCount = 0
    let hasNextPage = true

    while (hasNextPage && pageCount < MAX_PAGES) {
      pageCount++
      console.log(`[${new Date().toISOString()}] Fetching page ${pageCount}...`)

      const { products, hasNextPage: nextPage, endCursor } = await fetchPage(
        accessToken,
        warehouseId,
        cursor
      )

      // Transform and accumulate records
      const pageRecords = transformProducts(products)
      allRecords.push(...pageRecords)

      console.log(
        `[${new Date().toISOString()}] Page ${pageCount}: ${products.length} products, ` +
          `${pageRecords.length} location records. Total: ${allRecords.length}`
      )

      hasNextPage = nextPage
      cursor = endCursor

      // Small delay between pages to avoid rate limiting
      if (hasNextPage) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    if (pageCount >= MAX_PAGES) {
      console.warn(`[${new Date().toISOString()}] Reached max page limit (${MAX_PAGES})`)
    }

    if (allRecords.length === 0) {
      console.log(`[${new Date().toISOString()}] No inventory data to insert`)
      return { success: true, recordCount: 0 }
    }

    // Clear existing data and insert new data
    await clearTable(TABLE_NAME)
    const insertedCount = await batchInsert(TABLE_NAME, allRecords)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(
      `[${new Date().toISOString()}] Query inventory fetch completed. ` +
        `Pages: ${pageCount}, Records: ${insertedCount}, Duration: ${duration}s`
    )

    return { success: true, recordCount: insertedCount }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`[${new Date().toISOString()}] Query inventory fetch failed:`, errorMessage)
    return { success: false, recordCount: 0, error: errorMessage }
  }
}

