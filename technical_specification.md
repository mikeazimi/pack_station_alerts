# Real-Time ShipHero Inventory Monitoring App: Technical Specification

**Author:** Manus AI  
**Date:** December 2, 2025  
**Version:** 1.0

---

## Executive Summary

This document provides a comprehensive technical specification for building a real-time inventory monitoring application that integrates with the ShipHero GraphQL API. The application is designed for a third-party logistics provider (3PL) using dynamic slotting in ShipHero. It allows warehouse operators to monitor inventory levels at specific bin locations by entering a location prefix and provides visual alerts for low-stock items that require replenishment.

The system architecture is based on a **Backend-for-Frontend (BFF)** pattern, where a backend service handles all interactions with the ShipHero API, processes and caches data, and exposes clean REST endpoints for a lightweight frontend application. The specification includes two distinct data-fetching methodologies to enable real-world A/B testing and performance comparison.

---

## 1. Project Requirements

### 1.1. Functional Requirements

The application must fulfill the following functional requirements:

**FR1: Location Prefix Filtering**  
Users must be able to enter a location prefix (e.g., "PS01") into an input field, and the system must display inventory data only for locations whose names start with that prefix.

**FR2: Grid Display**  
The inventory data must be displayed in a grid layout with exactly 5 location cells per row. The number of rows must adjust dynamically based on the number of matching locations.

**FR3: Location Cell Content**  
Each location cell must display the following information:
- The full name of the bin location (e.g., "PS01-01")
- The SKU of the product stored in that location
- The on-hand quantity of that SKU

**FR4: Low-Stock Visual Alert**  
If the quantity of any SKU in a location is less than 5 units, the corresponding location cell must display a thick, flashing red border to draw attention for replenishment.

**FR5: Real-Time Updates**  
The backend must fetch fresh inventory data from the ShipHero API every 5 minutes to ensure the frontend displays near-real-time information.

**FR6: Dual Data-Fetching Methods**  
The system must implement two separate data-fetching methods (Inventory Snapshot and Direct Query) to allow for real-world performance testing and comparison.

**FR7: Plain Text Display**  
All data displayed to the user must be in plain text format. Any Base64-encoded values from the API must be decoded before being sent to the frontend.

### 1.2. Non-Functional Requirements

**NFR1: Performance**  
The frontend must respond to user input (prefix filtering) within 200 milliseconds.

**NFR2: Scalability**  
The backend must be capable of handling warehouses with thousands of SKUs and hundreds of bin locations without significant performance degradation.

**NFR3: Reliability**  
The scheduled data-fetching jobs must run reliably every 5 minutes, with automatic retry logic in case of transient failures.

**NFR4: Security**  
All API credentials and sensitive data must be stored securely using environment variables and must never be exposed to the frontend.

---

## 2. System Architecture

The system is composed of three primary components: a frontend application, a backend service, and a database for caching. The architecture follows a **Backend-for-Frontend (BFF)** pattern to ensure optimal performance and separation of concerns.

![System Architecture Diagram](system_architecture.png)

### 2.1. Component Overview

**Frontend Application:**  
A single-page application built with Vio (or any modern JavaScript framework) that provides a user interface for entering a location prefix and viewing the filtered inventory data in a grid layout.

**Backend Service (BFF):**  
A Node.js service that acts as an intermediary between the frontend and the ShipHero API. It handles authentication, data fetching, processing, caching, and exposes REST endpoints for the frontend to consume.

**Database (Supabase):**  
A PostgreSQL database hosted on Supabase that serves as a hot cache for the inventory data fetched from ShipHero. This allows the backend to respond to frontend requests instantly without making real-time calls to the ShipHero API.

**ShipHero API:**  
The external GraphQL API provided by ShipHero that serves as the source of truth for all inventory data.

### 2.2. Data Flow

The data flow for the system is as follows:

1.  **Scheduled Job Execution:** Every 5 minutes, two separate scheduled jobs run on the backend. One job uses the Inventory Snapshot method, and the other uses the Direct Query method.

2.  **Data Fetching:** Each job fetches inventory data from the ShipHero API using its respective method.

3.  **Data Processing:** The backend processes the raw API response, extracting the necessary fields (SKU, location name, quantity) and decoding any Base64-encoded values.

4.  **Data Caching:** The processed data is stored in the appropriate cache table in the Supabase database.

5.  **Frontend Request:** When a user enters a location prefix in the frontend, the frontend sends a request to the backend API endpoint (either `/api/inventory/snapshot` or `/api/inventory/query`).

6.  **Backend Query:** The backend queries its cache table for all inventory records where the location name starts with the specified prefix.

7.  **Response:** The backend sends a small, pre-filtered JSON array back to the frontend.

8.  **Frontend Display:** The frontend renders the data in a grid layout, applying the low-stock visual alert where necessary.

---

## 3. ShipHero API Integration

The ShipHero API is a GraphQL API that requires JWT-based authentication. This section details the key aspects of integrating with the API.

### 3.1. Authentication

**Endpoint:** `https://public-api.shiphero.com/auth/token`

**Method:** POST

**Request Body:**
```json
{
  "username": "your_email@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "expires_in": 2419200,
  "refresh_token": "cBWV3BROyQn_TMxETqr7ALQ...",
  "scope": "openid profile offline_access",
  "token_type": "Bearer"
}
```

The `access_token` must be included in the `Authorization` header of all subsequent API requests as `Bearer <access_token>`. The token expires every 28 days and must be refreshed using the `refresh_token` before expiration.

### 3.2. GraphQL Endpoint

**Endpoint:** `https://public-api.shiphero.com/graphql`

**Method:** POST

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "query { ... }",
  "variables": { ... }
}
```

### 3.3. Key Queries and Mutations

#### 3.3.1. Inventory Snapshot (Recommended Method)

**Generate Snapshot Mutation:**

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

**Check Snapshot Status Query:**

```graphql
query {
  inventory_snapshot(snapshot_id: "SNAPSHOT_ID") {
    request_id
    complexity
    snapshot {
      snapshot_id
      status
      snapshot_url
      snapshot_expiration
    }
  }
}
```

**Status Values:**
- `enqueued`: Waiting to process
- `processing`: Currently running
- `success`: Complete, JSON file available at `snapshot_url`
- `error`: Failed

**Snapshot JSON Structure:**

The downloaded JSON file will contain a nested structure with product data, including SKUs, locations, and quantities. The exact structure depends on whether the account uses dynamic slotting and the format version. The backend must parse this structure to extract the relevant fields.

#### 3.3.2. Direct Query Method (Alternative)

**Warehouse Products Query:**

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

**Pagination:**

The query must be executed repeatedly with the `after` parameter set to the `endCursor` value from the previous response until `hasNextPage` is `false`.

### 3.4. Important API Limitations

**Location Name Filtering:**  
The ShipHero API does not support wildcard or prefix-based filtering on location names. The `name` filter in the `locations` query requires an exact match. Therefore, all filtering by prefix must be performed on the backend after fetching the data.

**Rate Limiting:**  
The ShipHero API has rate limits and uses a complexity-based credit system. Each query has a complexity score, and accounts have a daily credit limit. The Inventory Snapshot method is far more efficient and consumes fewer credits than the Direct Query method, especially for large warehouses.

**Pagination:**  
All list-based queries (e.g., `warehouse_products`, `locations`) use cursor-based pagination. The backend must implement pagination logic to fetch all pages of results.

---

## 4. Database Schema

The backend will use two separate tables in Supabase to cache the inventory data from the two different fetching methods. This separation allows for clear A/B testing and performance comparison.

### 4.1. Table: `inventory_snapshot_cache`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique row identifier |
| `sku` | `TEXT` | `NOT NULL` | The product Stock Keeping Unit |
| `inventory_bin` | `TEXT` | `NOT NULL` | The name of the bin location (e.g., "PS01-01") |
| `quantity` | `INTEGER` | `NOT NULL` | The on-hand quantity in that bin |
| `fetched_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Timestamp of when the data was fetched |

**Index:**
```sql
CREATE INDEX idx_snapshot_bin_prefix ON inventory_snapshot_cache (inventory_bin text_pattern_ops);
```

This index is crucial for efficient prefix-based searches using the `LIKE` operator with a pattern like `'PS01%'`.

### 4.2. Table: `inventory_query_cache`

This table has the exact same structure as `inventory_snapshot_cache` to allow for direct comparison.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique row identifier |
| `sku` | `TEXT` | `NOT NULL` | The product Stock Keeping Unit |
| `inventory_bin` | `TEXT` | `NOT NULL` | The name of the bin location (e.g., "PS01-01") |
| `quantity` | `INTEGER` | `NOT NULL` | The on-hand quantity in that bin |
| `fetched_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Timestamp of when the data was fetched |

**Index:**
```sql
CREATE INDEX idx_query_bin_prefix ON inventory_query_cache (inventory_bin text_pattern_ops);
```

---

## 5. Backend API Specification

The backend will expose two REST API endpoints for the frontend to consume. Both endpoints have the same interface but query different cache tables.

### 5.1. Endpoint: Snapshot-Based Inventory

**URL:** `GET /api/inventory/snapshot`

**Query Parameters:**

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `prefix` | `string` | Yes | The location prefix to filter by (e.g., "PS01") |

**Response:**

**Status Code:** 200 OK

**Body:**
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

**Error Response:**

**Status Code:** 400 Bad Request (if `prefix` parameter is missing)

**Body:**
```json
{
  "error": "Prefix parameter is required"
}
```

**Status Code:** 500 Internal Server Error (if database query fails)

**Body:**
```json
{
  "error": "Internal server error"
}
```

### 5.2. Endpoint: Query-Based Inventory

**URL:** `GET /api/inventory/query`

**Query Parameters:**

Same as the snapshot endpoint.

**Response:**

Same format as the snapshot endpoint.

---

## 6. Frontend Specification

The frontend is a single-page application that provides a user interface for entering a location prefix and viewing the filtered inventory data.

### 6.1. User Interface Layout

**Header:**  
A prominent header at the top of the page that says "Real-Time Inventory Dashboard".

**Input Field:**  
A single, centered text input field below the header where the user can type a location prefix (e.g., "PS01").

**Inventory Grid:**  
Below the input field, a responsive grid that displays the filtered inventory locations. The grid must display exactly 5 location cells per row, with the number of rows adjusting dynamically based on the number of matching locations.

### 6.2. Location Cell Design

Each cell in the grid represents a single inventory bin location and must display:

- **Location Name:** The full name of the bin (e.g., "PS01-01") in bold text at the top of the cell.
- **SKU:** The SKU of the product in that bin, displayed below the location name.
- **Quantity:** The on-hand quantity of that SKU in the bin, displayed below the SKU.

**Low-Stock Alert:**  
If the `quantity` is less than 5, the cell must have a thick (e.g., 4px), flashing red border. The flashing effect should be implemented using a CSS animation that alternates the border color between red and transparent at a frequency of approximately 1 Hz (once per second).

### 6.3. Real-Time Filtering

As the user types in the input field, the frontend should send a request to the backend API endpoint to fetch the filtered data. To avoid excessive API calls, the frontend should implement a debounce mechanism (e.g., wait 300ms after the user stops typing before sending the request).

### 6.4. Two Separate Pages

The frontend must include two separate pages or views:

1.  **Page 1: Snapshot View** - This page queries the `/api/inventory/snapshot` endpoint.
2.  **Page 2: Query View** - This page queries the `/api/inventory/query` endpoint.

Both pages should have identical UI layouts and functionality, differing only in the API endpoint they call. This allows for direct comparison of the two data-fetching methods in a real-world environment.

---

## 7. Scheduled Jobs

The backend will use a scheduler (e.g., node-cron) to run two separate jobs every 5 minutes, each responsible for fetching and caching data using one of the two methods.

### 7.1. Job 1: Snapshot-Based Data Fetching

**Schedule:** Every 5 minutes (e.g., `*/5 * * * *` in cron syntax)

**Steps:**

1.  Send a `inventory_generate_snapshot` mutation to the ShipHero API.
2.  Store the returned `snapshot_id`.
3.  Poll the `inventory_snapshot` query every 15-30 seconds to check the status.
4.  Once the status is `success`, download the JSON file from the `snapshot_url`.
5.  Parse the JSON to extract the `sku`, `inventory_bin`, and `quantity` for each item.
6.  Clear the `inventory_snapshot_cache` table.
7.  Insert the new data into the table using a batch insert for performance.

**Error Handling:**

- If the snapshot generation fails (status is `error`), log the error and retry on the next scheduled run.
- If the snapshot takes longer than expected (e.g., more than 5 minutes), abort the polling and retry on the next scheduled run.
- Implement a maximum retry count to avoid infinite loops.

### 7.2. Job 2: Direct Query-Based Data Fetching

**Schedule:** Every 5 minutes (e.g., `*/5 * * * *` in cron syntax)

**Steps:**

1.  Send a `warehouse_products` query to the ShipHero API, requesting the first page of results.
2.  Process the response to extract the `sku`, `location.name`, and `quantity` for each item.
3.  Check the `pageInfo.hasNextPage` field.
4.  If `true`, make another request with the `after` parameter set to the `pageInfo.endCursor` value.
5.  Repeat steps 2-4 until `hasNextPage` is `false`.
6.  Clear the `inventory_query_cache` table.
7.  Insert all the collected data into the table using a batch insert for performance.

**Error Handling:**

- If any API request fails, log the error and retry that specific request up to 3 times with exponential backoff.
- If the retry limit is exceeded, abort the job and retry on the next scheduled run.
- Implement rate limiting to avoid exceeding the ShipHero API's rate limits.

---

## 8. Deployment and Operations

### 8.1. Environment Variables

The backend must be configured with the following environment variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `SHIPHERO_API_URL` | ShipHero GraphQL API endpoint | `https://public-api.shiphero.com/graphql` |
| `SHIPHERO_AUTH_URL` | ShipHero authentication endpoint | `https://public-api.shiphero.com/auth/token` |
| `SHIPHERO_REFRESH_URL` | ShipHero token refresh endpoint | `https://public-api.shiphero.com/auth/refresh` |
| `SHIPHERO_USERNAME` | ShipHero account email | `user@example.com` |
| `SHIPHERO_PASSWORD` | ShipHero account password | `your_password` |
| `SHIPHERO_WAREHOUSE_ID` | Base64-encoded warehouse ID | `V2FyZWhvdXNlOjExNzkw` |
| `SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | `your_supabase_anon_key` |
| `PORT` | Port for the backend server | `3000` |

### 8.2. Deployment Options

The backend can be deployed using one of the following options:

**Serverless Functions:**  
Deploy as serverless functions on platforms like Vercel, Netlify, or AWS Lambda. Note that scheduled jobs may require a separate cron service or a serverless cron provider.

**Containerized Service:**  
Deploy as a Docker container on platforms like Heroku, Render, Fly.io, or AWS ECS. This option provides more control over the runtime environment and is well-suited for scheduled jobs.

**Traditional Server:**  
Deploy on a traditional VPS or dedicated server. This option provides maximum control but requires more operational overhead.

### 8.3. Monitoring and Logging

The backend should implement comprehensive monitoring and logging to ensure reliability and ease of debugging:

- Log all API requests and responses (or at least errors) with timestamps.
- Monitor the execution time of scheduled jobs and alert if they exceed expected thresholds.
- Monitor the database size and query performance.
- Use a logging service like Logtail, Papertrail, or CloudWatch for centralized log management.
- Set up alerts (e.g., via email or Slack) for critical errors or job failures.

---

## 9. Testing and Validation

### 9.1. Unit Testing

The backend should include unit tests for:

- Authentication logic (token generation and refresh)
- Data processing functions (parsing API responses, extracting fields)
- Database operations (insert, query, clear)
- API endpoint handlers (request validation, response formatting)

### 9.2. Integration Testing

Integration tests should verify:

- End-to-end data flow from ShipHero API to the database
- Correct behavior of scheduled jobs
- API endpoint responses with real database data

### 9.3. Performance Testing

Performance tests should measure:

- Time taken for each scheduled job to complete
- API endpoint response time under various load conditions
- Database query performance with large datasets

### 9.4. A/B Testing

Once both methods are implemented, conduct A/B testing by:

1.  Running both scheduled jobs simultaneously for at least 24 hours.
2.  Comparing the time taken for each job to complete.
3.  Comparing the API credit usage for each method (check the ShipHero dashboard).
4.  Comparing the frontend response time when querying each endpoint.
5.  Verifying the data accuracy and consistency between the two methods.

Document the results and make a recommendation on which method to use for production.

---

## 10. Future Enhancements

The following enhancements can be considered for future iterations of the application:

**Real-Time Webhooks:**  
Instead of polling every 5 minutes, use ShipHero's Inventory Update webhook to receive real-time notifications when inventory changes. This would provide truly real-time updates and reduce API credit usage.

**Multi-Warehouse Support:**  
Allow users to select from multiple warehouses and view inventory data for each.

**Advanced Filtering:**  
Add additional filters such as SKU, quantity range, or product category.

**Historical Data:**  
Store historical inventory data and provide charts or reports showing inventory trends over time.

**Mobile Application:**  
Develop a mobile app (iOS/Android) for warehouse operators to monitor inventory on the go.

**User Authentication:**  
Add user authentication and role-based access control to restrict access to sensitive inventory data.

---

## 11. Conclusion

This technical specification provides a comprehensive blueprint for building a real-time inventory monitoring application that integrates with the ShipHero API. By implementing both the Inventory Snapshot and Direct Query methods, the system allows for real-world A/B testing to determine the most efficient and cost-effective approach for your specific use case. The architecture is designed to be scalable, reliable, and performant, ensuring a smooth user experience for warehouse operators.

For any questions or clarifications regarding this specification, please refer to the accompanying documentation files or consult the ShipHero API documentation at [https://developer.shiphero.com/](https://developer.shiphero.com/).
