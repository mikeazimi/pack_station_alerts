import { NextResponse } from "next/server"
import { fetchSnapshotInventory } from "@/lib/snapshot-fetcher"

/**
 * POST /api/trigger/snapshot - Manually trigger snapshot inventory fetch
 */
export async function POST() {
  const startTime = Date.now()

  console.log(`[${new Date().toISOString()}] Manual trigger: Snapshot fetch started`)

  try {
    const result = await fetchSnapshotInventory()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Snapshot inventory fetch completed",
        recordCount: result.recordCount,
        duration: `${duration}s`,
        timestamp: new Date().toISOString(),
      })
    } else {
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

    console.error(`[${new Date().toISOString()}] Manual trigger snapshot error:`, errorMessage)

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

export const maxDuration = 300 // 5 minutes max
export const dynamic = "force-dynamic"

