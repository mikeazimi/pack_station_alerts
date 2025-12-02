# Backend Implementation Guide

## Overview

This document provides a detailed implementation guide for the backend service that will power the real-time inventory monitoring dashboard. The backend will serve as a **Backend-for-Frontend (BFF)**, handling all interactions with the ShipHero GraphQL API, processing data, and exposing clean REST endpoints for the frontend to consume.

The backend will implement two distinct data-fetching strategies to allow for real-world A/B testing and performance comparison.

## Technology Stack

The recommended technology stack for the backend is as follows:

- **Runtime:** Node.js (v18 or later)
- **Framework:** Express.js or Fastify (Fastify is recommended for better performance)
- **Database:** Supabase (PostgreSQL)
- **HTTP Client:** Axios or node-fetch for making requests to the ShipHero API
- **Scheduler:** node-cron for scheduling periodic tasks
- **Environment Management:** dotenv for managing environment variables

## Environment Variables

The backend will require the following environment variables to be configured:

```
SHIPHERO_API_URL=https://public-api.shiphero.com/graphql
SHIPHERO_AUTH_URL=https://public-api.shiphero.com/auth/token
SHIPHERO_REFRESH_URL=https://public-api.shiphero.com/auth/refresh
SHIPHERO_USERNAME=your_shiphero_email@example.com
SHIPHERO_PASSWORD=your_shiphero_password
SHIPHERO_WAREHOUSE_ID=V2FyZWhvdXNlOjExNzkw
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
PORT=3000
```

## Authentication with ShipHero

The backend must authenticate with the ShipHero API to obtain a JWT access token. This token will be used in the `Authorization` header for all subsequent API requests.

### Initial Authentication

When the backend service starts, it should immediately authenticate with ShipHero to obtain an access token and a refresh token.

**Request:**

```javascript
const axios = require('axios');

async function authenticateWithShipHero() {
  const response = await axios.post(process.env.SHIPHERO_AUTH_URL, {
    username: process.env.SHIPHERO_USERNAME,
    password: process.env.SHIPHERO_PASSWORD,
  });

  const { access_token, refresh_token, expires_in } = response.data;

  // Store tokens securely (in memory or a secure store)
  global.shipheroAccessToken = access_token;
  global.shipheroRefreshToken = refresh_token;

  // Schedule token refresh before expiration (expires_in is in seconds)
  scheduleTokenRefresh(expires_in);

  return access_token;
}
```

### Token Refresh

The access token expires every 28 days. The backend should automatically refresh the token before it expires to maintain uninterrupted access to the API.

**Request:**

```javascript
async function refreshShipHeroToken() {
  const response = await axios.post(process.env.SHIPHERO_REFRESH_URL, {
    refresh_token: global.shipheroRefreshToken,
  });

  const { access_token, expires_in } = response.data;

  global.shipheroAccessToken = access_token;

  scheduleTokenRefresh(expires_in);

  return access_token;
}

function scheduleTokenRefresh(expiresInSeconds) {
  // Refresh 1 day before expiration
  const refreshTime = (expiresInSeconds - 86400) * 1000;
  setTimeout(refreshShipHeroToken, refreshTime);
}
```

## Database Schema

The backend will use two tables in Supabase to cache the inventory data from the two different fetching methods.

### Table 1: `inventory_snapshot_cache`

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

### Table 2: `inventory_query_cache`

```sql
CREATE TABLE inventory_query_cache (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  inventory_bin TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_query_bin_prefix ON inventory_query_cache (inventory_bin text_pattern_ops);
```

The `text_pattern_ops` index is crucial for efficient prefix-based searches using the `LIKE` operator with a pattern like `'PS01%'`.

## API Endpoints

The backend will expose two REST API endpoints for the frontend to consume.

### Endpoint 1: Snapshot-Based Inventory

**URL:** `GET /api/inventory/snapshot`

**Query Parameters:**
- `prefix` (required): The location prefix to filter by (e.g., "PS01").

**Response:**

```json
[
  {
    "location": "PS01-01",
    "sku": "ABC-123",
    "quantity": 3
  },
  {
    "location": "PS01-02",
    "sku": "DEF-456",
    "quantity": 25
  }
]
```

**Implementation:**

```javascript
app.get('/api/inventory/snapshot', async (req, res) => {
  const { prefix } = req.query;

  if (!prefix) {
    return res.status(400).json({ error: 'Prefix parameter is required' });
  }

  try {
    const { data, error } = await supabase
      .from('inventory_snapshot_cache')
      .select('inventory_bin, sku, quantity')
      .ilike('inventory_bin', `${prefix}%`);

    if (error) throw error;

    const formattedData = data.map(item => ({
      location: item.inventory_bin,
      sku: item.sku,
      quantity: item.quantity
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching snapshot inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Endpoint 2: Query-Based Inventory

**URL:** `GET /api/inventory/query`

**Query Parameters:**
- `prefix` (required): The location prefix to filter by (e.g., "PS01").

**Response:**

Same format as the snapshot endpoint.

**Implementation:**

Same as the snapshot endpoint, but querying from the `inventory_query_cache` table instead.

## Scheduled Jobs

The backend will use a scheduler (e.g., node-cron) to run two separate jobs every 5 minutes, each responsible for fetching and caching data using one of the two methods.

### Job 1: Snapshot-Based Data Fetching

This job will use the ShipHero Inventory Snapshot feature to fetch all inventory data for the warehouse.

**Schedule:** Every 5 minutes

**Steps:**

1.  **Generate Snapshot:**
    - Send a mutation to the ShipHero API to generate a new inventory snapshot.

    ```graphql
    mutation {
      inventory_generate_snapshot(
        data: {
          warehouse_id: "V2FyZWhvdXNlOjExNzkw"
        }
      ) {
        request_id
        complexity
        snapshot {
          snapshot_id
          status
        }
      }
    }
    ```

2.  **Poll for Completion:**
    - Poll the `inventory_snapshot` query every 15-30 seconds to check the status of the snapshot.

    ```graphql
    query {
      inventory_snapshot(snapshot_id: "SNAPSHOT_ID") {
        request_id
        complexity
        snapshot {
          snapshot_id
          status
          snapshot_url
        }
      }
    }
    ```

3.  **Download and Process:**
    - Once the status is `success`, download the JSON file from the `snapshot_url`.
    - Parse the JSON to extract the `sku`, `inventory_bin`, and `quantity` for each item.

4.  **Update Database:**
    - Clear the `inventory_snapshot_cache` table.
    - Insert the new data into the table.

**Important Considerations:**

- The snapshot generation is asynchronous and can take anywhere from a few seconds to a few minutes depending on the size of the warehouse.
- Implement robust error handling for cases where the snapshot fails or times out.
- Consider using a webhook (via the `post_url` parameter) instead of polling for better efficiency if your backend is publicly accessible.

### Job 2: Direct Query-Based Data Fetching

This job will use the `warehouse_products` query to fetch inventory data directly.

**Schedule:** Every 5 minutes

**Steps:**

1.  **Execute Paginated Query:**
    - Send a `warehouse_products` query to the ShipHero API, requesting the first page of results.

    ```graphql
    query {
      warehouse_products(warehouse_id: "V2FyZWhvdXNlOjExNzkw") {
        request_id
        complexity
        data(first: 100) {
          edges {
            node {
              product {
                sku
              }
              locations(first: 50) {
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
    ```

2.  **Handle Pagination:**
    - Check the `pageInfo.hasNextPage` field.
    - If `true`, make another request with the `after` parameter set to the `pageInfo.endCursor` value.
    - Repeat until `hasNextPage` is `false`.

3.  **Process Data:**
    - For each product in the response, iterate through its locations.
    - Extract the `sku`, `location.name` (as `inventory_bin`), and `quantity`.

4.  **Update Database:**
    - Clear the `inventory_query_cache` table.
    - Insert the new data into the table.

**Important Considerations:**

- This method can be very slow and expensive in terms of API credits, especially for warehouses with thousands of products.
- Implement rate limiting and error handling to avoid exceeding the ShipHero API's rate limits.
- Consider using a batch insert strategy for the database to improve performance.

## Error Handling and Logging

The backend should implement comprehensive error handling and logging to ensure reliability and ease of debugging.

- Log all API requests and responses (or at least errors).
- Implement retry logic for transient network errors.
- Send alerts (e.g., via email or Slack) if a scheduled job fails multiple times in a row.
- Use a logging library like Winston or Pino for structured logging.

## Deployment Considerations

The backend can be deployed in several ways depending on your infrastructure preferences:

- **Serverless Functions:** Deploy as serverless functions on platforms like Vercel, Netlify, or AWS Lambda. Note that scheduled jobs may require a separate cron service.
- **Containerized Service:** Deploy as a Docker container on platforms like Heroku, Render, or AWS ECS.
- **Traditional Server:** Deploy on a traditional VPS or dedicated server.

Ensure that the deployment environment has persistent storage for the Supabase connection and that the scheduler runs reliably.

## Testing the Two Methods

Once both methods are implemented, you can test them side-by-side by:

1.  Running both scheduled jobs simultaneously.
2.  Monitoring the time it takes for each job to complete.
3.  Comparing the API credit usage for each method (check your ShipHero dashboard).
4.  Testing the frontend response time when querying each endpoint.
5.  Verifying the data accuracy and consistency between the two methods.

This real-world testing will provide valuable insights into which method is best suited for your specific use case and warehouse size.
