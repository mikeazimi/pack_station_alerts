# Real-Time ShipHero Inventory Monitoring App

## Project Overview

This project is a real-time inventory monitoring application designed for a third-party logistics (3PL) warehouse using ShipHero with dynamic slotting. The application allows warehouse operators to monitor inventory levels at specific bin locations by entering a location prefix (e.g., "PS01") and provides visual alerts for low-stock items that require replenishment.

The system is designed to test two different data-fetching methodologies in a real-world environment to determine the most efficient and cost-effective approach for your specific use case.

## Key Features

- **Prefix-Based Filtering:** Filter inventory locations by entering a prefix (e.g., "PS01" to see PS01-01, PS01-02, etc.)
- **Grid Display:** Inventory displayed in a clean grid layout with 5 locations per row
- **Low-Stock Alerts:** Visual flashing red border for any location with less than 5 units
- **Real-Time Updates:** Backend fetches fresh data from ShipHero every 5 minutes
- **A/B Testing:** Two separate data-fetching methods implemented for performance comparison
- **Plain Text Display:** All data displayed in human-readable format (no Base64-encoded values)

## Architecture

The application follows a **Backend-for-Frontend (BFF)** pattern:

- **Frontend:** Vio (or React/Next.js) single-page application
- **Backend:** Node.js service (Express or Fastify)
- **Database:** Supabase (PostgreSQL) for caching
- **API:** ShipHero GraphQL API

![System Architecture](https://private-us-east-1.manuscdn.com/sessionFile/y9HoxAh3V23ZivkfXS2NlJ/sandbox/139ICUrCdyYMc3ygblasTr-images_1764707675268_na1fn_L2hvbWUvdWJ1bnR1L3NoaXBoZXJvLWludmVudG9yeS1hcHAvc3lzdGVtX2FyY2hpdGVjdHVyZQ.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUveTlIb3hBaDNWMjNaaXZrZlhTMk5sSi9zYW5kYm94LzEzOUlDVXJDZHlZTWMzeWdibGFzVHItaW1hZ2VzXzE3NjQ3MDc2NzUyNjhfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwzTm9hWEJvWlhKdkxXbHVkbVZ1ZEc5eWVTMWhjSEF2YzNsemRHVnRYMkZ5WTJocGRHVmpkSFZ5WlEucG5nIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=B6E6bxI-~HKRMGgDZtQ9QrW0EGnO59BhdSYA7aqNtTm53ChjSGDHu6YtOd7XjX7BqdFHBlV8c7r2OtPbJK7kWxsjh-Tjxqkee6NWuZ9nJQKfoT06HRchF-7Hxs5FN~6u7jRWl7mHRLWwKZG-DeCmNN~9DJBsj-Fy5hEyW1d5RNvcSmxbhcRSX2igQjHlOeADsAJX5N1EuoCxk3JEMS1Pbc-SrPYDY8r3C-2dV-II0hMIof1cLOWa0-0l2rz4bECrpxRaORcG5H4GGuUDX61VOtwtM0PfQsCmgDlOhyZ5~kxXtpPTJpZJFwz-GldTxsbduUT2k5GWUziqbAKQ7ABvVQ__)

## Documentation Files

This repository includes comprehensive documentation to help you build and deploy the application:

### 1. **technical_specification.md**
The complete technical specification document covering all aspects of the project, including:
- Functional and non-functional requirements
- Detailed system architecture
- ShipHero API integration details
- Database schema
- Backend API specification
- Frontend specification
- Deployment and operations guidelines

**Start here for a comprehensive understanding of the entire project.**

### 2. **backend_implementation_guide.md**
A detailed implementation guide for the backend service, including:
- Technology stack recommendations
- Environment variable configuration
- Authentication with ShipHero
- Database schema and setup
- API endpoint implementation
- Scheduled job implementation
- Error handling and logging

**Use this as your primary reference when building the backend.**

### 3. **v0_prompt.md**
A prompt specifically designed for V0 (or any AI-assisted frontend builder) to generate the user interface. This file describes:
- Core concept and key features
- Page layout and design requirements
- Location cell content and styling
- Low-stock visual alert specifications

**Use this prompt with V0 to quickly generate the frontend UI.**

### 4. **cursor_context_reference.md**
A quick reference guide designed to be added to your Cursor IDE project for context. It includes:
- Project overview
- Key architecture points
- Critical API limitations
- Database schema
- Backend API endpoints
- Frontend requirements
- Sample GraphQL queries
- Environment variables
- Testing strategy

**Add this file to your Cursor project for quick reference while coding.**

### 5. **shiphero_graphql_queries.graphql**
A collection of sample GraphQL queries and mutations for the ShipHero API, including:
- Inventory snapshot queries
- Direct query method (warehouse_products)
- Location queries
- Product queries
- Inventory mutations
- Utility queries

**Use this file as a reference when implementing API calls in your backend.**

### 6. **shiphero_research.md**
Research notes on the ShipHero API, including:
- Key API endpoints for inventory monitoring
- Dynamic slotting overview
- Important queries for the use case
- Critical findings about API limitations
- Inventory snapshot documentation

**Refer to this for deeper understanding of the ShipHero API.**

### 7. **system_architecture.md**
A detailed breakdown of the system architecture, including:
- Component overview
- Data flow
- Database schema
- API endpoints
- Base64 decoding notes

**Use this for a visual and conceptual understanding of how the system works.**

## Quick Start Guide

### Step 1: Set Up the Backend

1. Create a new Node.js project
2. Install dependencies: `npm install express axios dotenv @supabase/supabase-js node-cron`
3. Configure environment variables (see `cursor_context_reference.md`)
4. Set up Supabase database tables (see `backend_implementation_guide.md`)
5. Implement authentication with ShipHero
6. Implement the two scheduled jobs (snapshot and direct query)
7. Implement the two API endpoints (`/api/inventory/snapshot` and `/api/inventory/query`)
8. Deploy the backend (Heroku, Render, Fly.io, etc.)

### Step 2: Set Up the Frontend

1. Use the `v0_prompt.md` file with V0 to generate the initial UI
2. Create two separate pages: one for the snapshot method, one for the query method
3. Implement the prefix input field with debouncing
4. Implement the grid layout (5 cells per row)
5. Implement the low-stock visual alert (flashing red border for quantity < 5)
6. Connect each page to its respective backend endpoint
7. Deploy the frontend (Vercel, Netlify, etc.)

### Step 3: Test and Compare

1. Run both scheduled jobs for at least 24 hours
2. Monitor job execution time
3. Compare API credit usage in the ShipHero dashboard
4. Test frontend response time for both endpoints
5. Verify data accuracy and consistency
6. Document your findings and choose the best method for production

## Two Data-Fetching Methods

### Method 1: Inventory Snapshot (Recommended)

**How it works:**
- Backend requests ShipHero to generate an inventory snapshot
- ShipHero processes the request asynchronously
- Backend polls for completion and downloads the JSON file
- Backend parses the JSON and caches the data in Supabase

**Pros:**
- Very efficient (single API call, bulk data)
- Low API credit usage
- Fast download once generated
- Designed for large datasets

**Cons:**
- Asynchronous (takes time to generate)
- Requires polling or webhook setup

### Method 2: Direct Query (warehouse_products)

**How it works:**
- Backend executes a paginated `warehouse_products` query
- Backend makes multiple sequential API calls to fetch all pages
- Backend processes and caches the data in Supabase

**Pros:**
- Synchronous (immediate results)
- More straightforward implementation

**Cons:**
- Very inefficient (many API calls)
- High API credit usage
- Slow for large warehouses
- Complex pagination logic required

## Important Notes

### API Limitations

1. **No Prefix Filtering:** The ShipHero API does NOT support wildcard or prefix filtering on location names. All filtering must be done on the backend after fetching the data.

2. **Base64 Encoding:** ShipHero uses Base64-encoded IDs, but the actual data fields (SKU, inventory_bin) are plain text. No decoding is needed for display purposes.

3. **Pagination Required:** All list-based queries use cursor-based pagination. The backend must implement pagination logic to fetch all results.

4. **Rate Limits:** The API has a complexity-based credit system. The snapshot method is far more efficient than the direct query method.

### Dynamic Slotting

Your 3PL uses dynamic slotting, which means products can be stored in different locations at different times. The system is designed to handle this by fetching and displaying the current state of inventory every 5 minutes.

### Low-Stock Threshold

The low-stock threshold is set to 5 units. Any location with a quantity less than 5 will display a flashing red border to alert warehouse operators to replenish the stock.

## Environment Variables

The backend requires the following environment variables:

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

## Useful Links

- [ShipHero API Documentation](https://developer.shiphero.com/)
- [ShipHero Community Forum](https://community.shiphero.com/)
- [ShipHero Inventory Flow Documentation](https://developer.shiphero.com/flows/inventory/)
- [ShipHero GraphQL Schema](https://developer.shiphero.com/schema/)
- [Supabase Documentation](https://supabase.com/docs)

## Support

For questions or issues related to:
- **ShipHero API:** Visit the [ShipHero Community Forum](https://community.shiphero.com/)
- **This Project:** Refer to the comprehensive documentation files included in this repository

## Next Steps

1. Review the `technical_specification.md` file for a complete understanding of the project
2. Follow the `backend_implementation_guide.md` to build the backend
3. Use the `v0_prompt.md` to generate the frontend UI
4. Add the `cursor_context_reference.md` to your Cursor project for quick reference
5. Use the `shiphero_graphql_queries.graphql` file when implementing API calls
6. Deploy and test both methods to determine the best approach for your use case

Good luck with your project!
