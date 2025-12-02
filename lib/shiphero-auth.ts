import axios from "axios"
import { getShipHeroCredentials } from "./settings"

// Types
interface TokenResponse {
  access_token: string
  expires_in: number
}

interface TokenCache {
  accessToken: string | null
  expiresAt: number | null
  refreshToken: string | null // Track which refresh token was used
}

// In-memory token cache
const tokenCache: TokenCache = {
  accessToken: null,
  expiresAt: null,
  refreshToken: null,
}

// Buffer time before token expiration to refresh (5 minutes)
const REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * Refresh the ShipHero access token using the refresh token from database
 */
async function refreshAccessToken(): Promise<string> {
  const refreshUrl = process.env.SHIPHERO_REFRESH_URL

  if (!refreshUrl) {
    throw new Error("Missing SHIPHERO_REFRESH_URL environment variable")
  }

  // Get refresh token from database
  const credentials = await getShipHeroCredentials()

  if (!credentials?.refreshToken) {
    throw new Error("ShipHero credentials not configured. Please enter your refresh token and warehouse ID in Settings.")
  }

  const refreshToken = credentials.refreshToken

  console.log(`[${new Date().toISOString()}] Refreshing ShipHero access token...`)

  try {
    const response = await axios.post<TokenResponse>(refreshUrl, {
      refresh_token: refreshToken,
    })

    const { access_token, expires_in } = response.data

    if (!access_token) {
      throw new Error("No access_token received from ShipHero auth endpoint")
    }

    // Cache the token with expiration time and the refresh token used
    tokenCache.accessToken = access_token
    tokenCache.refreshToken = refreshToken
    // expires_in is in seconds, convert to milliseconds and subtract buffer
    tokenCache.expiresAt = Date.now() + expires_in * 1000 - REFRESH_BUFFER_MS

    console.log(
      `[${new Date().toISOString()}] ShipHero access token refreshed successfully. ` +
        `Expires in ${Math.floor(expires_in / 86400)} days`
    )

    return access_token
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `[${new Date().toISOString()}] Failed to refresh ShipHero token:`,
        error.response?.data || error.message
      )
      throw new Error(`ShipHero auth failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`)
    }
    throw error
  }
}

/**
 * Check if the current token is valid (exists and not expired)
 */
function isTokenValid(): boolean {
  return !!(tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt)
}

/**
 * Check if cached token matches current refresh token
 */
async function isCacheValid(): Promise<boolean> {
  if (!isTokenValid()) return false
  
  const credentials = await getShipHeroCredentials()
  return tokenCache.refreshToken === credentials?.refreshToken
}

/**
 * Get a valid ShipHero access token
 * Automatically refreshes if expired or about to expire
 */
export async function getShipHeroAccessToken(): Promise<string> {
  if (await isCacheValid()) {
    return tokenCache.accessToken!
  }

  return await refreshAccessToken()
}

/**
 * Force refresh the access token (useful for testing or error recovery)
 */
export async function forceRefreshToken(): Promise<string> {
  tokenCache.accessToken = null
  tokenCache.expiresAt = null
  return await refreshAccessToken()
}

/**
 * Clear the token cache (useful for testing or when credentials change)
 */
export function clearTokenCache(): void {
  tokenCache.accessToken = null
  tokenCache.expiresAt = null
  tokenCache.refreshToken = null
}

