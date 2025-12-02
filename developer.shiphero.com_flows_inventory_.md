
**URL:** https://developer.shiphero.com/flows/inventory/

---

CTRL K
Getting Started
Graphql Primer
Examples
Flows
Inventory
Returns
Order Fulfillment
Purchase Orders
3PL Billing
Wholesale Orders Packed Outside ShipHero
Merge Orders
Webhooks
Inventory Update
Inventory Change
Shipment Update
Automation Rules
Order Canceled
Capture Payment
PO Update
Return Update
Tote Complete
Tote Cleared
Order Packed Out
Package Added
Print Barcode
Order Allocated
Order Deallocated
Generate Label
Shipment ASN
Recurring Data Exports
Schema
Community
System
Flows
Inventory
Inventory

If you are using Dynamic Slotting, this section will explain the basic mutations and queries available:

Managing Inventory on Dynamic Slotting Accounts

Also, for managing Inventory through our API we have two powerful tools:

Inventory sync
Inventory snapshot
Managing Inventory on Dynamic Slotting Accounts
 

If you are using Dynamic Slotting, you might need to use the following queries & mutations when managing Inventory:

Location Query
Locations Query
Locations list for a specific Product Query
Create a new Location Mutation
Update an existing Location Mutation
Inventory add / Inventory remove Mutations
Inventory Replace Mutation
Location Query
 

This query will allow you to get the location’s name, warehouse_id or type by using the location’s id.

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

You should get something like this:

{