# System Architecture: Real-Time Inventory Monitoring App

## 1. Overview

This document outlines the system architecture for a real-time inventory monitoring application that interfaces with the ShipHero API. The system is designed to support two distinct data-fetching methodologies for A/B testing in a real-world environment:

1.  **Inventory Snapshot Method:** An efficient, asynchronous approach for bulk data retrieval.
2.  **Direct Query Method:** A synchronous, real-time query approach.

The architecture is based on a **Backend-for-Frontend (BFF)** pattern, which ensures the frontend remains fast and responsive while the backend handles the complexities of data fetching, processing, and caching.

## 2. Core Technologies

- **Frontend:** Vio (or any other modern JavaScript framework)
- **Backend:** Node.js with a framework like Express or Fastify (recommended for performance)
- **Database:** Supabase (PostgreSQL) for data caching and storage
- **API:** ShipHero GraphQL API
- **Deployment:** The backend can be deployed as a serverless function or a containerized service.

## 3. System Components & Data Flow

The system is composed of a frontend application, a backend service with two distinct data-fetching modules, and a database for caching.

![System Architecture Diagram](system_architecture.png)

### 3.1. Frontend Application

- A user interface built with Vio.
- An input field for the user to enter a location prefix (e.g., "PS01").
- Two separate pages or views, each dedicated to one of the data-fetching methods.
- The UI will display inventory locations in a grid (5 per row), showing the SKU and quantity for each.
- It will implement the visual alert (flashing red border) for any location with a quantity less than 5.

### 3.2. Backend Service (BFF)

The backend will expose two primary API endpoints for the frontend to consume.

#### Endpoint 1: Snapshot-Based Inventory

- **Endpoint:** `GET /api/inventory/snapshot?prefix=<location_prefix>`
- **Method:** Utilizes the highly efficient, asynchronous **Inventory Snapshot** feature of the ShipHero API.

**Data Flow:**

1.  **Scheduled Job (Every 5 minutes):**
    - A cron job on the backend triggers the `inventory_generate_snapshot` mutation in the ShipHero API for the specified `warehouse_id`.
    - The backend stores the returned `snapshot_id`.

2.  **Poll for Completion:**
    - The backend polls the `inventory_snapshot` query with the `snapshot_id` every ~15-30 seconds to check the job `status`.

3.  **Download and Process:**
    - Once the status is `success`, the backend downloads the JSON data from the provided `snapshot_url`.
    - It parses this large JSON file, extracting the necessary fields: `sku`, `inventory_bin`, and `on_hand` quantity for every item.

4.  **Cache Data:**
    - The backend clears the previous inventory data in the Supabase database and inserts the fresh data from the snapshot. This table will serve as a hot cache.

5.  **Serve Frontend Request:**
    - When the frontend calls the endpoint, the backend simply runs a fast SQL query against its own database (e.g., `SELECT * FROM inventory WHERE inventory_bin LIKE 'PS01%';`).
    - It returns a small, pre-filtered JSON array to the frontend.

#### Endpoint 2: Direct Query-Based Inventory

- **Endpoint:** `GET /api/inventory/query?prefix=<location_prefix>`
- **Method:** Utilizes a synchronous, paginated `warehouse_products` query.

**Data Flow:**

1.  **Scheduled Job (Every 5 minutes):**
    - A cron job on the backend triggers the data-fetching process.

2.  **Paginated API Calls:**
    - The backend executes the `warehouse_products` query for the specified `warehouse_id`.
    - **Crucially, it must handle pagination.** It will repeatedly call the API, using the `endCursor` from each response to fetch the next page of results until `hasNextPage` is `false`.
    - This process involves many sequential API calls and requires robust error handling and rate limit management.

3.  **Cache Data:**
    - As the data is fetched, it is processed and stored in a separate table in the Supabase database. This table acts as the cache for the direct query method.

4.  **Serve Frontend Request:**
    - Similar to the snapshot method, when the frontend calls this endpoint, the backend queries its dedicated cache table for the requested prefix.
    - It returns a small, pre-filtered JSON array to the frontend.

## 4. Database Schema (Supabase/PostgreSQL)

We will use two tables to keep the data from the two methods isolated for clear A/B testing.

**Table 1: `inventory_snapshot_cache`**

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | Unique row identifier |
| `sku` | `TEXT NOT NULL` | The product Stock Keeping Unit |
| `inventory_bin` | `TEXT NOT NULL` | The name of the bin location (e.g., "PS01-01") |
| `quantity` | `INTEGER NOT NULL` | The on-hand quantity in that bin |
| `fetched_at` | `TIMESTAMPTZ` | Timestamp of when the data was fetched |

*An index should be created on the `inventory_bin` column for fast prefix-based lookups (`CREATE INDEX idx_snapshot_bin_prefix ON inventory_snapshot_cache (inventory_bin text_pattern_ops);`).*

**Table 2: `inventory_query_cache`**

This table will have the exact same structure as the snapshot cache, allowing for a direct comparison of the data and performance.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | Unique row identifier |
| `sku` | `TEXT NOT NULL` | The product Stock Keeping Unit |
| `inventory_bin` | `TEXT NOT NULL` | The name of the bin location (e.g., "PS01-01") |
| `quantity` | `INTEGER NOT NULL` | The on-hand quantity in that bin |
| `fetched_at` | `TIMESTAMPTZ` | Timestamp of when the data was fetched |

*A similar index should be created on the `inventory_bin` column here as well.*

## 5. Base64 Decoding

The ShipHero API uses Base64-encoded strings for its object IDs (e.g., `T3JkZXI6MTAwNTc5Njk4`). However, the actual data fields we need, such as `inventory_bin` and `sku`, are returned as plain text. Therefore, **no Base64 decoding is required** for the core data display. The backend will handle any ID-related decoding if necessary for internal operations, but the data sent to the frontend will be clean, human-readable text as requested.
