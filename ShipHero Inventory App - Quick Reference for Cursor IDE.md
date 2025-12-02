# ShipHero Inventory App - Quick Reference for Cursor IDE

## Project Overview

This is a real-time inventory monitoring application for a 3PL warehouse using ShipHero with dynamic slotting. The app displays inventory levels for specific bin locations, filtered by prefix (e.g., "PS01"), with visual alerts for low-stock items.

## Key Architecture Points

- **Pattern:** Backend-for-Frontend (BFF)
- **Frontend:** Vio (or React/Next.js)
- **Backend:** Node.js (Express or Fastify)
- **Database:** Supabase (PostgreSQL)
- **API:** ShipHero GraphQL API
- **Refresh Interval:** Every 5 minutes

## Two Data-Fetching Methods (A/B Testing)

### Method 1: Inventory Snapshot (Recommended)
- **Efficiency:** High (single API call, bulk data)
- **Cost:** Low API credits
- **Speed:** Asynchronous (takes time to generate, but fast to download)
- **Use Case:** Best for large warehouses

### Method 2: Direct Query (warehouse_products)
- **Efficiency:** Low (many paginated API calls)
- **Cost:** High API credits
- **Speed:** Synchronous but slow due to pagination
- **Use Case:** Testing/comparison only

## Critical API Limitations

1. **No Prefix Filtering:** The ShipHero API does NOT support wildcard/prefix filtering on location names. All filtering must be done on the backend after fetching data.

2. **Base64 IDs:** ShipHero uses Base64-encoded IDs (e.g., `V2FyZWhvdXNlOjExNzkw`), but the actual data fields (SKU, inventory_bin) are plain text. No decoding needed for display.

3. **Pagination Required:** All list queries use cursor-based pagination with `hasNextPage` and `endCursor`.

4. **Rate Limits:** API has complexity-based credit system. Snapshot method is far more efficient.

## Database Schema

### Table: `inventory_snapshot_cache`
```sql
CREATE TABLE inventory_snapshot_cache (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  inventory_bin TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_snapshot_bin_prefix ON inventory_snapshot_cache (inventory_bin text_pattern_ops);
```

### Table: `inventory_query_cache`
Same structure as above, for the direct query method.

## Backend API Endpoints

### GET /api/inventory/snapshot?prefix=PS01
Returns inventory for locations starting with "PS01" from the snapshot cache.

### GET /api/inventory/query?prefix=PS01
Returns inventory for locations starting with "PS01" from the direct query cache.

**Response Format:**
```json
[
  {
    "location": "PS01-01",
    "sku": "ABC-123",
    "quantity": 3
  }
]
```

## Frontend Requirements

1. **Input Field:** User enters location prefix (e.g., "PS01")
2. **Grid Layout:** 5 locations per row, dynamic rows
3. **Cell Content:** Location name, SKU, Quantity
4. **Low-Stock Alert:** Flashing red border if quantity < 5
5. **Two Pages:** One for snapshot method, one for query method

## ShipHero Authentication

**Endpoint:** `https://public-api.shiphero.com/auth/token`

**Request:**
```json
{
  "username": "your_email@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAi...",
  "expires_in": 2419200,
  "refresh_token": "cBWV3BR..."
}
```

**Token Expiration:** 28 days (must refresh before expiration)

## Key GraphQL Queries

### Generate Inventory Snapshot
```graphql
mutation {
  inventory_generate_snapshot(
    data: { warehouse_id: "V2FyZWhvdXNlOjExNzkw" }
  ) {
    snapshot { snapshot_id status }
  }
}
```

### Check Snapshot Status
```graphql
query {
  inventory_snapshot(snapshot_id: "SNAPSHOT_ID") {
    snapshot {
      snapshot_id
      status
      snapshot_url
    }
  }
}
```

### Warehouse Products Query (Paginated)
```graphql
query {
  warehouse_products(warehouse_id: "V2FyZWhvdXNlOjExNzkw") {
    data(first: 100) {
      edges {
        node {
          product { sku }
          locations(first: 50) {
            edges {
              node {
                location { name }
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
```

## Environment Variables

```
SHIPHERO_API_URL=https://public-api.shiphero.com/graphql
SHIPHERO_AUTH_URL=https://public-api.shiphero.com/auth/token
SHIPHERO_REFRESH_URL=https://public-api.shiphero.com/auth/refresh
SHIPHERO_USERNAME=your_email@example.com
SHIPHERO_PASSWORD=your_password
SHIPHERO_WAREHOUSE_ID=V2FyZWhvdXNlOjExNzkw
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
PORT=3000
```

## Scheduled Jobs (node-cron)

**Schedule:** `*/5 * * * *` (every 5 minutes)

**Job 1:** Fetch data using Inventory Snapshot method, update `inventory_snapshot_cache`

**Job 2:** Fetch data using Direct Query method, update `inventory_query_cache`

## Important Notes for Development

1. **Plain Text Only:** User requested no Base64-encoded values in the UI. All data must be human-readable.

2. **Dynamic Slotting:** The 3PL uses dynamic slotting, meaning products can be in different locations at different times.

3. **Prefix Filtering:** Must be done on the backend using SQL `LIKE 'PS01%'` after fetching data from ShipHero.

4. **Low-Stock Threshold:** 5 units. Anything below triggers the flashing red border.

5. **Grid Layout:** Exactly 5 cells per row, no exceptions.

## Testing Strategy

1. Deploy both methods simultaneously
2. Monitor job execution time
3. Compare API credit usage in ShipHero dashboard
4. Test frontend response time for both endpoints
5. Verify data accuracy and consistency
6. Document findings and recommend best method

## Useful Links

- ShipHero API Docs: https://developer.shiphero.com/
- ShipHero Community: https://community.shiphero.com/
- Inventory Flow Docs: https://developer.shiphero.com/flows/inventory/
- GraphQL Schema: https://developer.shiphero.com/schema/
