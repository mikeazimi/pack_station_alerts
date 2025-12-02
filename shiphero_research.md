# ShipHero API Research Notes

## Key API Endpoints for Inventory Monitoring

### Dynamic Slotting Overview
ShipHero uses dynamic slotting for 3PL operations, which means inventory can be stored in different locations dynamically.

### Important Queries for Our Use Case

#### 1. Locations Query
- Get all locations in a warehouse
- Can filter by warehouse_id
- Returns: location id, name, zone, type, pickable, sellable status

```graphql
query {
  locations(warehouse_id: "V2FyZWhvdXNlOjExNzkw") {
    request_id
    data {
      edges {
        node {
          id
          name
          zone
          type {
            name
          }
          pickable
          sellable
        }
      }
    }
  }
}
```

#### 2. Product Query with Locations
- Get all locations for a specific SKU
- Returns quantity per location
- Essential for our inventory monitoring

```graphql
query {
  product(sku: "1122334458") {
    request_id
    data {
      sku
      name
      warehouse_products {
        warehouse_id
        locations {
          edges {
            node {
              location_id
              quantity
            }
          }
        }
      }
    }
  }
}
```

#### 3. Location Query (Single)
- Get details of a specific location by ID
- Returns: name, warehouse_id, type

```graphql
query {
  location(id: "QmluOjIyNDMwNDY=") {
    request_id
    complexity
    data {
      legacy_id
      name
      warehouse_id
      type {
        name
      }
    }
  }
}
```

## Key Findings

1. **Base64 Encoding**: ShipHero uses base64 encoded IDs (e.g., "QmluOjIyNDMwNDY=")
   - Need to decode these to show plain text like "PS01-01"
   - Location names are stored as plain text in the `name` field

2. **3PL Considerations**: 
   - Must include `customer_account_id` when performing operations on 3PL accounts
   - Inventory mutations require this field

3. **Pagination**: 
   - API uses cursor-based pagination with `edges` and `node` structure
   - Need to handle pagination for large datasets

4. **Rate Limits**: 
   - GraphQL API has complexity scoring
   - Need to implement efficient queries to avoid rate limiting

## Next Steps for Research
- Check if there's a way to filter locations by name prefix in the API
- Look for warehouse_products query to get all inventory at once
- Investigate webhooks for real-time updates (Inventory Update webhook exists)


## Warehouse Products Query

This is the key query for getting all inventory in a warehouse:

```graphql
query {
  warehouse_products(warehouse_id: "V2FyZWhvdXNlOjExNzkw") {
    request_id
    complexity
    data(first: 2) {
      edges {
        node {
          id
          account_id
          on_hand
          inventory_bin
          reserve_inventory
          reorder_amount
          reorder_level
          custom
          warehouse {
            id
            dynamic_slotting
            profile
          }
          product {
            id
            name
            sku
          }
        }
        cursor
      }
    }
  }
}
```

**Key Fields:**
- `on_hand`: Current quantity available
- `inventory_bin`: The bin/location name (e.g., "PS01-01")
- `warehouse.dynamic_slotting`: Boolean indicating if dynamic slotting is enabled
- `product.sku`: The SKU of the product
- `product.name`: Product name

**Important Note:** The `inventory_bin` field appears to be a single field, not a list of locations. Need to investigate if this is the primary location or if we need to use the product query with locations instead.


## CRITICAL FINDING: Location Name Filter

**Important:** The `name` filter in the `locations` query is **NOT a wildcard field**. It requires the **full exact name** to be passed.

This means we **cannot** directly filter by prefix like "PS01" to get all locations starting with "PS01".

### New Filters Available (as of Nov 2024):
1. `name: "string"` - Exact match only, not wildcard
2. `pickable: boolean` - Filter by pickable attribute
3. `sellable: boolean` - Filter by sellable attribute

### Solution for Prefix Filtering:
Since we can't use wildcard filtering, we'll need to:
1. Query ALL locations in the warehouse using `locations` query
2. Filter client-side (in the backend) for locations that start with the specified prefix (e.g., "PS01")
3. For each matching location, get the inventory details

OR

1. Use `warehouse_products` query to get all products with their locations
2. Filter the locations client-side by prefix

This means the filtering will happen in our backend, not in the GraphQL query itself.


## Best Approach: Inventory Snapshot

According to ShipHero community experts, the **most efficient way** to get location-level inventory data is to use the **Inventory Snapshot** feature.

### Why Inventory Snapshot?
- Much faster and cheaper (in API credits) than nested queries
- Returns every product-location pairing with quantities
- Can get empty locations if `has_inventory` is not set to true
- Better for real-time monitoring applications

### Alternative Nested Query Approach
You can query locations and nest products/inventory, but this is:
- Slow and expensive (high complexity/credit cost)
- Deep nesting required: `locations > products > warehouse_products > locations > quantity`

### Recommended Query Strategy for Our Use Case:

**Option 1: Inventory Snapshot (Recommended)**
1. Run inventory snapshot query
2. Filter results client-side for locations matching prefix (e.g., "PS01")
3. Display results with SKU and quantity per location

**Option 2: Warehouse Products Query**
1. Query `warehouse_products` for the specific warehouse
2. For each product, get the nested `locations` with `location_id` and `quantity`
3. Filter client-side for locations matching the prefix
4. Group by location and display

### Query Structure for Option 2:
```graphql
query {
  warehouse_products(warehouse_id: "WAREHOUSE_ID") {
    data(first: 100) {
      edges {
        node {
          product {
            sku
            name
          }
          locations(first: 50) {
            edges {
              node {
                location_id
                location {
                  name
                }
                quantity
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

Note: Need to verify if `location { name }` is available in the nested structure or if we need to decode the location_id.


## Inventory Snapshot - Detailed Documentation

### What is an Inventory Snapshot?
An asynchronous job that:
1. Iterates over all warehouses (or filtered by warehouse_id)
2. Iterates over all products in each warehouse
3. Aggregates vendors + bins + lots for each product
4. Outputs a JSON file with all inventory data

### Key Features:
- **Asynchronous**: Runs in background, sends notification when complete
- **JSON Export**: Returns a downloadable JSON file (available for 24 hours)
- **Webhook Support**: Can POST to an endpoint when complete
- **Email Notification**: Can send email with download link

### Important Filters (to avoid timeout):
- `warehouse_id`: Get results for specific warehouse only
- `customer_account_id`: For 3PL, get SKUs for specific customer
- `has_inventory`: Return only SKUs with stock
- `updated_from`: Only SKUs updated since specified date-time (UTC)

### Generate Snapshot Mutation:
```graphql
mutation {
  inventory_generate_snapshot(
    data: {
      warehouse_id: "V2FyZWhvdXNlOjExNzkw"
      notification_email: "your@email.com"
      # OR use post_url for webhook
      # post_url: "https://your-api.com/webhook"
    }
  ) {
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

### Check Snapshot Status:
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

### Status Values:
- `enqueued`: Waiting to process
- `processing`: Currently running
- `success`: Complete, JSON file available
- `error`: Failed

### JSON Format Examples:
- Brand Account - Dynamic Slotting - New Format
- Brand Account - Dynamic Slotting - Old Format

(Need to check actual JSON structure to understand location data format)
