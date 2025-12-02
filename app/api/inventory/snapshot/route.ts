import { NextRequest, NextResponse } from "next/server"
import { queryByPrefix } from "@/lib/supabase-client"

const TABLE_NAME = "inventory_snapshot_cache"

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Get prefix from query parameters
    const searchParams = request.nextUrl.searchParams
    const prefix = searchParams.get("prefix")

    // Validate prefix parameter
    if (!prefix || prefix.trim() === "") {
      return NextResponse.json(
        { error: "Missing required query parameter: prefix" },
        { status: 400 }
      )
    }

    const trimmedPrefix = prefix.trim().toUpperCase()

    console.log(
      `[${new Date().toISOString()}] API /inventory/snapshot - Querying with prefix: ${trimmedPrefix}`
    )

    // Query the database
    const records = await queryByPrefix(TABLE_NAME, trimmedPrefix)

    // Transform records to match the expected response format
    const response = records.map((record) => ({
      location: record.inventory_bin,
      sku: record.sku,
      quantity: record.quantity,
    }))

    const duration = Date.now() - startTime

    console.log(
      `[${new Date().toISOString()}] API /inventory/snapshot - ` +
        `Found ${response.length} records in ${duration}ms`
    )

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Response-Time": `${duration}ms`,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    console.error(
      `[${new Date().toISOString()}] API /inventory/snapshot - Error:`,
      errorMessage
    )

    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    )
  }
}

