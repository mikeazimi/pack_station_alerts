import { NextRequest, NextResponse } from "next/server"
import { fetchQueryInventory } from "@/lib/query-fetcher"

/**
 * Verify the request is from Vercel Cron
 * Vercel adds an Authorization header with the CRON_SECRET
 */
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // In development, allow requests without auth for testing
  if (process.env.NODE_ENV === "development") {
    console.log(`[${new Date().toISOString()}] CRON /query - Dev mode, skipping auth check`)
    return true
  }

  if (!cronSecret) {
    console.error(`[${new Date().toISOString()}] CRON /query - CRON_SECRET not configured`)
    return false
  }

  // Vercel sends: "Bearer <CRON_SECRET>"
  const expectedAuth = `Bearer ${cronSecret}`

  if (authHeader !== expectedAuth) {
    console.error(`[${new Date().toISOString()}] CRON /query - Invalid authorization header`)
    return false
  }

  return true
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  console.log(`[${new Date().toISOString()}] CRON /query - Job started`)

  // Verify cron authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    // Execute the query fetch
    const result = await fetchQueryInventory()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    if (result.success) {
      console.log(
        `[${new Date().toISOString()}] CRON /query - Job completed successfully. ` +
          `Records: ${result.recordCount}, Duration: ${duration}s`
      )

      return NextResponse.json(
        {
          success: true,
          message: "Query inventory fetch completed",
          recordCount: result.recordCount,
          duration: `${duration}s`,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    } else {
      console.error(
        `[${new Date().toISOString()}] CRON /query - Job failed. Error: ${result.error}`
      )

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          duration: `${duration}s`,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.error(
      `[${new Date().toISOString()}] CRON /query - Unexpected error:`,
      errorMessage
    )

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: `${duration}s`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Vercel Cron configuration
export const maxDuration = 300 // 5 minutes max execution time
export const dynamic = "force-dynamic"

