# API Contracts: Pharmacy POS & Management System

**Base URL**: `/api`
**Implementation**: Next.js 16 API Route Handlers (`src/app/api/`)
**Auth**: All endpoints except `POST /api/auth/login` require a valid JWT in HTTP-only cookie `auth-token`.
**Content-Type**: `application/json`
**Monetary values**: All amounts in piasters (integer). Client converts to EGP for display.
**Quantities**: All in base units (integer). Client converts using subUnitConversionFactor for display.

> **Server Component optimization**: Pages rendered as Server Components (dashboard, product list, reports) bypass these API routes and call services directly. These endpoints exist for Client Components (POS, forms, modals) and external access.

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Arabic error message",
    "details": [{ "field": "name", "message": "مطلوب" }]
  }
}
```

Standard HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 500.

---

## Authentication

### POST /api/auth/login
`src/app/api/auth/login/route.ts`

Login with email and password. Sets HTTP-only cookie.

**Request**:
```json
{ "email": "string", "password": "string" }
```

**Response 200**:
```json
{
  "user": {
    "_id": "string",
    "name": "string",
    "email": "string",
    "role": "owner | cashier",
    "permissions": ["string"]
  }
}
```

Sets `auth-token` and `refresh-token` as HTTP-only cookies.

### POST /api/auth/refresh
`src/app/api/auth/refresh/route.ts`

Refresh an expired access token using the refresh cookie.

**Response 200**: Sets new `auth-token` cookie.

### GET /api/auth/me
`src/app/api/auth/me/route.ts`

Get current authenticated user profile.

**Response 200**: User object.

### POST /api/auth/logout
`src/app/api/auth/logout/route.ts`

Clear auth cookies.

**Response 200**: `{ "success": true }`

---

## Users (Owner only)

### GET /api/users
`src/app/api/users/route.ts` — **Permission**: `users.manage`

**Query**: `?page=1&limit=20&role=cashier&isActive=true`

**Response 200**:
```json
{
  "data": [{ "_id", "name", "email", "role", "permissions", "isActive", "createdAt" }],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

### POST /api/users
Create a new user. **Permission**: `users.manage`

**Request**:
```json
{
  "email": "string", "password": "string", "name": "string",
  "role": "owner | cashier", "permissions": ["string"]
}
```

### PUT /api/users/:id
`src/app/api/users/[id]/route.ts` — **Permission**: `users.manage`

**Request**: Partial user object (name, email, role, permissions, isActive).

---

## Products

### GET /api/products
`src/app/api/products/route.ts` — **Permission**: `products.view`

**Query**: `?search=بنادول&category=مسكنات&page=1&limit=20&isActive=true`

**Response 200**:
```json
{
  "data": [{
    "_id", "barcode", "nameAr", "nameEn", "imageUrl", "manufacturer",
    "category", "sellingPrice", "baseUnit", "subUnit", "subUnitConversionFactor",
    "totalStock": 150, "floorStock": 100, "warehouseStock": 50,
    "isActive", "hasExpiredBatches": false, "hasExpiringSoonBatches": true,
    "isLowStock": false
  }],
  "pagination": { "page": 1, "limit": 20, "total": 245 }
}
```

### GET /api/products/:id
`src/app/api/products/[id]/route.ts` — Full product details with batch breakdown.

### POST /api/products
Create a product. **Permission**: `products.manage`

**Request**:
```json
{
  "barcode": "string | null", "nameAr": "string (required)", "nameEn": "string",
  "imageUrl": "string", "manufacturer": "string", "category": "string",
  "description": "string", "activeIngredient": "string", "dosageForm": "string",
  "route": "string", "uses": "string", "pharmacology": "string",
  "sellingPrice": 15000, "baseUnit": "علبة", "subUnit": "شريط",
  "subUnitConversionFactor": 10, "lowStockThreshold": 5
}
```

### PUT /api/products/:id
Update product. **Permission**: `products.manage`

### GET /api/products/alerts
`src/app/api/products/alerts/route.ts` — **Permission**: `products.view`

**Response 200**:
```json
{
  "expired": [{ "_id", "nameAr", "batchCount": 2 }],
  "expiringSoon": [{ "_id", "nameAr", "earliestExpiry": "2026-06-01", "batchCount": 1 }],
  "lowStock": [{ "_id", "nameAr", "floorStock": 3, "lowStockThreshold": 10 }],
  "outOfStock": [{ "_id", "nameAr", "floorStock": 0 }]
}
```

---

## POS

### POST /api/pos/search
`src/app/api/pos/search/route.ts` — **Permission**: `pos.search`

Fast product search for POS (Client Component).

**Request**:
```json
{ "query": "string", "type": "barcode | text" }
```

**Response 200**:
```json
{
  "results": [{
    "_id", "barcode", "nameAr", "nameEn", "sellingPrice",
    "baseUnit", "subUnit", "subUnitConversionFactor",
    "floorStock": 50, "isExpired": false, "hasExpiredBatches": false
  }]
}
```

### POST /api/pos/checkout
`src/app/api/pos/checkout/route.ts` — **Permission**: `pos.checkout`

Create a sale with FEFO batch depletion.

**Request**:
```json
{
  "items": [{
    "productId": "string", "quantity": 2, "unitSold": "base | sub",
    "discount": { "type": "amount | percentage", "value": 500 }
  }],
  "invoiceDiscount": { "type": "amount | percentage", "value": 1000 },
  "paymentMode": "cash | credit | partial",
  "paidAmount": 25000,
  "customerId": "string | null"
}
```

**Response 201**: Created invoice with batchAllocations.

**Errors**: 400 (insufficient stock, discount exceeds max, credit without customer)

### POST /api/pos/cancel/:invoiceId
`src/app/api/pos/cancel/[invoiceId]/route.ts` — **Permission**: `pos.cancel`

Cancel a completed sale. Reverses stock and financial effects.

---

## Customers

### GET /api/customers — List customers. `?search=أحمد&hasDebt=true&page=1&limit=20`
### GET /api/customers/:id — Customer profile with debts, payments, adjustments.
### POST /api/customers — Create customer. `{ "name": "required", "phone": "optional" }`
### PUT /api/customers/:id — Update customer.

### POST /api/customers/:id/payments
Record customer payment. **Permission**: `customers.payments`

**Request**: `{ "amount": 50000 }`

Auto-allocates to oldest unpaid invoices (FIFO).

### POST /api/customers/:id/adjustments
Manual balance adjustment. **Permission**: `balance.adjust` (owner only)

**Request**: `{ "amount": -5000, "reason": "string (required)" }`

---

## Suppliers

### GET /api/suppliers — List suppliers. `?search=string&page=1&limit=20`
### GET /api/suppliers/:id — Supplier profile with invoices, payments, adjustments.
### POST /api/suppliers — Create supplier.
### PUT /api/suppliers/:id — Update supplier.
### POST /api/suppliers/:id/adjustments — Manual balance adjustment. **Permission**: `balance.adjust`

---

## Supplier Invoices

### GET /api/supplier-invoices — List. `?supplierId=string&status=active&page=1&limit=20`
### GET /api/supplier-invoices/:id — Full invoice details.

### POST /api/supplier-invoices
Create supplier invoice (auto-adds stock to warehouse). **Permission**: `supplier-invoices.manage`

**Request**:
```json
{
  "invoiceNumber": "string", "supplierId": "string", "date": "2026-03-09",
  "items": [{
    "productId": "string", "batchNumber": "string",
    "expirationDate": "2027-06-01", "quantity": 100, "unitCost": 5000
  }],
  "notes": "string"
}
```

### PUT /api/supplier-invoices/:id — Edit invoice (adjusts stock). Only when `status=active`.
### POST /api/supplier-invoices/:id/void — Void invoice (reverses stock). Error 409 if stock already sold.
### POST /api/supplier-invoices/:id/payments — Record payment. `{ "amount": 50000 }`

### POST /api/supplier-returns
`src/app/api/supplier-returns/route.ts` — Process supplier return.

---

## Stock Management

### POST /api/stock/transfers — Transfer between warehouse/floor. **Permission**: `stock.transfer`

**Request**: `{ "productId", "batchId", "quantity": 20, "direction": "to_floor | to_warehouse", "reason": "required" }`

### GET /api/stock/transfers — List transfers with filters.

### POST /api/stock/adjustments — Manual adjustment. **Permission**: `stock.adjust` (owner only)

**Request**: `{ "productId", "batchId", "location": "warehouse | floor", "newQuantity": 45, "reason": "required" }`

---

## Refunds

### POST /api/refunds — Create refund. **Permission**: `refunds.create`

**Request**: `{ "originalInvoiceId": "string | null", "items": [{ "productId", "quantity", "unitPrice" }] }`

Stock returned to pharmacy floor. Customer balance adjusted if applicable.

### GET /api/refunds — List refunds with filters.

---

## Inventory Audits

### POST /api/inventory-audits — Start new session. **Permission**: `inventory-audits.manage`
### GET /api/inventory-audits/:id — Get session with counts.
### PUT /api/inventory-audits/:id/counts — Update physical counts.
### POST /api/inventory-audits/:id/approve — Approve adjustments and close session.

---

## Reports

All report endpoints require **Permission**: `reports.view` (owner only by default).

### GET /api/reports/dashboard — Owner dashboard summary (sales, profit, debt, alerts).
### GET /api/reports/sales — Sales report. `?period=today|yesterday|this_week|this_month|custom&from=date&to=date&compare=mom|yoy`
### GET /api/reports/profit — Profit report (batch-level COGS).
### GET /api/reports/stock — Stock report.
### GET /api/reports/customer-debt — Customer debt summary.
### GET /api/reports/supplier-debt — Supplier debt summary.
### GET /api/reports/export/:type — Excel export. Returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

---

## Audit Logs

### GET /api/audit-logs — Search logs. **Permission**: `audit-logs.view`

**Query**: `?userId=string&action=sale.created&entityType=SaleInvoice&invoiceNumber=string&productId=string&from=date&to=date&page=1&limit=50`

---

## Settings

### GET /api/settings — Get system settings. **Permission**: `settings.view`
### PUT /api/settings — Update settings. **Permission**: `settings.manage`

---

## Backup

### POST /api/backup/export — Export all data as JSON. **Permission**: `backup.manage`
### POST /api/backup/import — Import from JSON backup. **Permission**: `backup.manage`
