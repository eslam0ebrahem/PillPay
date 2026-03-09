# Data Model: Pharmacy POS & Management System

**Branch**: `001-pharmacy-pos-system` | **Date**: 2026-03-09

> All monetary values stored as integers in piasters (1 EGP = 100 piasters).
> All quantities stored in base units.
> All dates stored as UTC ISO 8601.

## Entity Relationship Overview

```
User ──creates──► SaleInvoice ──references──► Customer
 │                    │                           │
 │                    ├──contains──► SaleItem ◄──► Product ◄──► Batch
 │                    │                                          │
 │                    └──consumes──► BatchAllocation ────────────┘
 │
 ├──creates──► SupplierInvoice ──references──► Supplier
 │                    │
 │                    └──creates──► Batch
 │
 ├──creates──► StockTransfer ──references──► Batch
 ├──creates──► Refund
 ├──creates──► CustomerPayment
 ├──creates──► SupplierPayment
 └──triggers──► AuditLog
```

## Collections

### users

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| email | String | unique, required | Login credential |
| passwordHash | String | required | bcrypt hash |
| name | String | required | Display name (Arabic) |
| role | String | enum: "owner", "cashier" | User role |
| permissions | [String] | default by role | Granular permission keys |
| isActive | Boolean | default: true | Soft delete flag |
| createdAt | Date | auto | |
| updatedAt | Date | auto | |

**Indexes**: `{ email: 1 }` (unique)

---

### products

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| barcode | String | unique, sparse | Null for custom items |
| nameAr | String | required | Arabic product name |
| nameEn | String | | English product name |
| imageUrl | String | | Product image URL |
| manufacturer | String | | Manufacturer name |
| category | String | | Product category |
| description | String | | Free text description |
| activeIngredient | String | | Pharmaceutical data |
| dosageForm | String | | e.g., tablet, syrup |
| route | String | | e.g., oral, topical |
| uses | String | | Indications |
| pharmacology | String | | Pharmacological class |
| sellingPrice | Integer | required, >= 0 | In piasters |
| baseUnit | String | required | e.g., "علبة" (box) |
| subUnit | String | nullable | e.g., "شريط" (strip) |
| subUnitConversionFactor | Integer | nullable, >= 1 | Units of subUnit per baseUnit |
| lowStockThreshold | Integer | default from settings | In base units |
| isActive | Boolean | default: true | Catalog visibility |
| createdAt | Date | auto | |
| updatedAt | Date | auto | |

**Indexes**:
- `{ barcode: 1 }` (unique, sparse)
- `{ nameAr: "text", nameEn: "text" }` (text index, language: "arabic")
- `{ category: 1 }`
- `{ isActive: 1 }`

---

### batches

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| productId | ObjectId | ref: products, required | Parent product |
| batchNumber | String | required | Supplier batch identifier |
| expirationDate | Date | required | Batch expiry |
| purchasePrice | Integer | required, >= 0 | Cost per base unit in piasters |
| warehouseQty | Integer | >= 0 | Stock in warehouse (base units) |
| floorQty | Integer | >= 0 | Stock on pharmacy floor (base units) |
| supplierInvoiceId | ObjectId | ref: supplierInvoices | Source invoice |
| createdAt | Date | auto | |

**Indexes**:
- `{ productId: 1, expirationDate: 1 }` (FEFO queries)
- `{ productId: 1, floorQty: 1 }` (available floor stock)
- `{ expirationDate: 1 }` (expiration alerts)
- `{ supplierInvoiceId: 1 }`

**Computed (virtual/aggregation)**:
- Product-level total stock = SUM(warehouseQty + floorQty) across all batches for a productId
- Product-level floor stock = SUM(floorQty) across all batches for a productId

---

### saleInvoices

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| invoiceNumber | String | unique, auto-generated | Sequential: INV-YYYYMMDD-NNNN |
| items | [SaleItem] | required, min 1 | Embedded line items |
| subtotal | Integer | >= 0 | Sum of item subtotals (piasters) |
| invoiceDiscount | DiscountObj | | Invoice-level discount |
| total | Integer | >= 0 | Final total after discount (piasters) |
| paidAmount | Integer | >= 0 | Amount paid at checkout (piasters) |
| remainingBalance | Integer | >= 0 | total - paidAmount (piasters) |
| paymentMode | String | enum: "cash", "credit", "partial" | |
| customerId | ObjectId | ref: customers, nullable | Required if remainingBalance > 0 |
| cashierId | ObjectId | ref: users, required | Who processed the sale |
| status | String | enum: "completed", "cancelled" | |
| createdAt | Date | auto | |
| updatedAt | Date | auto | |

**SaleItem (embedded)**:

| Field | Type | Description |
|-------|------|-------------|
| productId | ObjectId | ref: products |
| productNameAr | String | Snapshot at time of sale |
| quantity | Integer | In base units |
| unitSold | String | "base" or "sub" — display unit used |
| displayQuantity | Number | Quantity in display unit (for receipt/display) |
| unitPrice | Integer | Selling price per display unit (piasters) |
| discount | DiscountObj | Per-item discount |
| subtotal | Integer | After item discount (piasters) |
| batchAllocations | [BatchAllocation] | FEFO cost tracking |

**BatchAllocation (embedded)**:

| Field | Type | Description |
|-------|------|-------------|
| batchId | ObjectId | ref: batches |
| quantity | Integer | Base units consumed from this batch |
| unitCost | Integer | Cost per base unit from this batch (piasters) |

**DiscountObj (embedded)**:

| Field | Type | Description |
|-------|------|-------------|
| type | String | "amount" or "percentage" |
| value | Integer | Amount in piasters, or percentage * 100 |

**Indexes**:
- `{ invoiceNumber: 1 }` (unique)
- `{ customerId: 1, status: 1 }` (customer debt queries)
- `{ cashierId: 1, createdAt: -1 }`
- `{ createdAt: -1 }` (reports)
- `{ status: 1 }`

---

### customers

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| name | String | required | Customer name (Arabic) |
| phone | String | nullable | Optional phone number |
| totalOwed | Integer | >= 0, default 0 | Denormalized total debt (piasters) |
| createdAt | Date | auto | |
| updatedAt | Date | auto | |

**Indexes**:
- `{ name: "text" }` (search)
- `{ phone: 1 }` (sparse)

**Denormalization note**: `totalOwed` is updated atomically on each sale, payment, refund, and manual adjustment. Periodic reconciliation job can verify against sum of unpaid invoices.

---

### customerPayments

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| customerId | ObjectId | ref: customers, required | |
| amount | Integer | > 0 | Total payment amount (piasters) |
| allocations | [PaymentAllocation] | | Which invoices were settled |
| receivedBy | ObjectId | ref: users, required | Who received the payment |
| createdAt | Date | auto | |

**PaymentAllocation (embedded)**:

| Field | Type | Description |
|-------|------|-------------|
| invoiceId | ObjectId | ref: saleInvoices |
| amount | Integer | Amount applied to this invoice (piasters) |

**Indexes**:
- `{ customerId: 1, createdAt: -1 }`

---

### balanceAdjustments

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| entityType | String | enum: "customer", "supplier" | What balance is adjusted |
| entityId | ObjectId | required | Customer or supplier ID |
| amount | Integer | required | Positive = increase debt, negative = decrease |
| reason | String | required | Mandatory justification |
| adjustedBy | ObjectId | ref: users, required | Owner who made adjustment |
| createdAt | Date | auto | |

**Indexes**:
- `{ entityType: 1, entityId: 1, createdAt: -1 }`

---

### suppliers

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| name | String | required | Supplier name |
| phone | String | | Contact phone |
| address | String | | Business address |
| contactPerson | String | | Contact person name |
| notes | String | | Free text notes |
| totalOwed | Integer | >= 0, default 0 | Denormalized total owed (piasters) |
| createdAt | Date | auto | |
| updatedAt | Date | auto | |

**Indexes**:
- `{ name: "text" }`

---

### supplierInvoices

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| invoiceNumber | String | required | Supplier's invoice number |
| supplierId | ObjectId | ref: suppliers, required | |
| date | Date | required | Invoice date |
| items | [SupplierInvoiceItem] | required, min 1 | Line items |
| total | Integer | >= 0 | Invoice total (piasters) |
| paidAmount | Integer | >= 0 | Total paid so far (piasters) |
| remainingBalance | Integer | >= 0 | total - paidAmount (piasters) |
| status | String | enum: "active", "voided" | |
| notes | String | | Free text |
| createdAt | Date | auto | |
| updatedAt | Date | auto | |

**SupplierInvoiceItem (embedded)**:

| Field | Type | Description |
|-------|------|-------------|
| productId | ObjectId | ref: products |
| batchNumber | String | Batch identifier |
| expirationDate | Date | Batch expiry |
| quantity | Integer | In base units |
| unitCost | Integer | Cost per base unit (piasters) |
| lineTotal | Integer | quantity * unitCost (piasters) |

**Indexes**:
- `{ supplierId: 1, status: 1 }`
- `{ invoiceNumber: 1 }`
- `{ createdAt: -1 }`

---

### supplierPayments

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| supplierId | ObjectId | ref: suppliers, required | |
| supplierInvoiceId | ObjectId | ref: supplierInvoices, nullable | Specific invoice or general |
| amount | Integer | > 0 | Payment amount (piasters) |
| paidBy | ObjectId | ref: users, required | |
| createdAt | Date | auto | |

**Indexes**:
- `{ supplierId: 1, createdAt: -1 }`
- `{ supplierInvoiceId: 1 }`

---

### supplierReturns

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| supplierId | ObjectId | ref: suppliers, required | |
| supplierInvoiceId | ObjectId | ref: supplierInvoices, nullable | Original invoice |
| items | [ReturnItem] | required, min 1 | |
| total | Integer | >= 0 | Return total (piasters) |
| processedBy | ObjectId | ref: users, required | |
| createdAt | Date | auto | |

**ReturnItem (embedded)**:

| Field | Type | Description |
|-------|------|-------------|
| productId | ObjectId | ref: products |
| batchId | ObjectId | ref: batches |
| quantity | Integer | Base units returned |
| unitCost | Integer | Cost per unit (piasters) |
| lineTotal | Integer | quantity * unitCost |

**Indexes**:
- `{ supplierId: 1 }`

---

### stockTransfers

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| productId | ObjectId | ref: products, required | |
| batchId | ObjectId | ref: batches, required | |
| quantity | Integer | > 0, required | Base units transferred |
| direction | String | enum: "to_floor", "to_warehouse" | |
| reason | String | required | e.g., "restock", "return", "damaged" |
| transferredBy | ObjectId | ref: users, required | |
| createdAt | Date | auto | |

**Indexes**:
- `{ productId: 1, createdAt: -1 }`
- `{ transferredBy: 1 }`

---

### refunds

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| refundNumber | String | unique, auto-generated | REF-YYYYMMDD-NNNN |
| originalInvoiceId | ObjectId | ref: saleInvoices, nullable | Null for standalone refunds |
| items | [RefundItem] | required, min 1 | |
| total | Integer | >= 0 | Refund total (piasters) |
| customerId | ObjectId | ref: customers, nullable | If credit sale refund |
| processedBy | ObjectId | ref: users, required | |
| createdAt | Date | auto | |

**RefundItem (embedded)**:

| Field | Type | Description |
|-------|------|-------------|
| productId | ObjectId | ref: products |
| quantity | Integer | Base units refunded |
| unitPrice | Integer | Price per unit at time of sale (piasters) |
| subtotal | Integer | quantity * unitPrice (piasters) |

**Indexes**:
- `{ refundNumber: 1 }` (unique)
- `{ originalInvoiceId: 1 }`
- `{ customerId: 1 }`

---

### auditLogs

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| userId | ObjectId | ref: users, required | Who performed the action |
| action | String | required | e.g., "sale.created", "stock.adjusted" |
| entityType | String | required | e.g., "SaleInvoice", "Batch", "Customer" |
| entityId | ObjectId | required | ID of affected entity |
| details | Object | | Flexible payload with action-specific data |
| invoiceNumber | String | nullable | For searchability by invoice |
| productId | ObjectId | nullable | For searchability by product |
| timestamp | Date | required, default: now | Immutable creation time |

**Indexes**:
- `{ userId: 1, timestamp: -1 }`
- `{ action: 1, timestamp: -1 }`
- `{ entityType: 1, entityId: 1 }`
- `{ invoiceNumber: 1 }` (sparse)
- `{ productId: 1 }` (sparse)
- `{ timestamp: -1 }`

**Immutability enforcement**: Mongoose model exposes only `create()` and `find()` operations. No `update` or `delete` routes. Application-level middleware blocks modifications.

---

### inventoryAuditSessions

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Auto-generated |
| status | String | enum: "in_progress", "completed" | |
| counts | [AuditCount] | | Product counts |
| startedBy | ObjectId | ref: users, required | |
| startedAt | Date | auto | |
| completedAt | Date | nullable | |

**AuditCount (embedded)**:

| Field | Type | Description |
|-------|------|-------------|
| productId | ObjectId | ref: products |
| location | String | "warehouse" or "floor" |
| expectedQty | Integer | System quantity at audit start (base units) |
| actualQty | Integer | Physical count entered (base units) |
| discrepancy | Integer | actualQty - expectedQty |
| adjusted | Boolean | Whether adjustment was approved |

**Indexes**:
- `{ status: 1 }`
- `{ startedAt: -1 }`

---

### settings

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | String | "global" | Singleton document |
| expiringSoonDays | Integer | default: 90 | Days before expiry to trigger alert |
| defaultLowStockThreshold | Integer | default: 10 | Default low-stock threshold (base units) |
| maxDiscountPercentage | Integer | default: 10000 | Max discount in basis points (10000 = 100%) |
| createdAt | Date | auto | |
| updatedAt | Date | auto | |

## State Transitions

### SaleInvoice Status
```
completed ──cancel──► cancelled
```

### SupplierInvoice Status
```
active ──void──► voided
```

### InventoryAuditSession Status
```
in_progress ──complete──► completed
```

## Key Business Rules (Data Layer)

1. **FEFO Query**: `batches.find({ productId, floorQty: { $gt: 0 }, expirationDate: { $exists: true } }).sort({ expirationDate: 1 })`
2. **Customer debt consistency**: `customer.totalOwed == SUM(saleInvoices.remainingBalance where customerId and status=completed) + SUM(balanceAdjustments where entityType=customer and entityId)`
3. **Supplier debt consistency**: `supplier.totalOwed == SUM(supplierInvoices.remainingBalance where supplierId and status=active) + SUM(balanceAdjustments where entityType=supplier and entityId)`
4. **Stock consistency**: For each product, `SUM(batches.warehouseQty) + SUM(batches.floorQty)` = total stock
5. **Barcode uniqueness**: Enforced by sparse unique index — custom products (null barcode) are allowed
