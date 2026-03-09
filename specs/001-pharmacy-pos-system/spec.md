# Feature Specification: Pharmacy POS & Management System

**Feature Branch**: `001-pharmacy-pos-system`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Build a cloud-hosted web application for managing a pharmacy business — Arabic-only pharmacy POS, stock management, warehouse management, supplier purchasing, customer debt tracking, and analytics system."

## Clarifications

### Session 2026-03-09

- Q: Should products support partial selling units (e.g., strip from a box)? → A: Yes — each product defines a base unit (purchase unit) and one optional sellable sub-unit with a conversion factor (e.g., box→strip, factor=10). Stock is tracked in base units; the POS allows selling in either unit.
- Q: Should selling expired products be blocked or warned? → A: Warning with override — POS displays a clear warning when a cashier attempts to sell an expired product, but allows the cashier to confirm and proceed.
- Q: Should large discounts or refunds require owner approval? → A: No — cashiers can apply any discount and issue any refund freely, constrained only by the owner-configured maximum discount percentage. No approval workflow is needed.
- Q: Can the owner manually adjust customer and supplier balances? → A: Yes — the owner may increase or decrease customer/supplier balances with a mandatory reason. All manual adjustments are logged in the immutable audit trail.
- Q: How should product variants be modeled? → A: Flat catalog — each variant (dosage, pack size, etc.) is an independent product with its own barcode, name, price, and stock. No parent-child grouping.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner Login & Dashboard (Priority: P1)

The pharmacy owner opens the application in a browser and logs in with their credentials. After successful authentication, they land on a dashboard showing a high-level overview of the business: today's total sales, cash in hand, net profit, outstanding customer debt, outstanding supplier debt, top-selling products, slow-moving products, and any expired or expiring-soon items. All text and layout are in Arabic (RTL).

**Why this priority**: Authentication is the entry point for all system functionality. The dashboard gives the owner immediate business visibility — the primary value proposition for the owner role.

**Independent Test**: Can be tested by creating an owner account, logging in, and verifying the dashboard loads with summary data (or empty-state placeholders for a fresh system).

**Acceptance Scenarios**:

1. **Given** a registered owner account, **When** the owner enters valid credentials, **Then** they are authenticated and redirected to the owner dashboard.
2. **Given** invalid credentials, **When** the owner attempts to log in, **Then** an appropriate error message is displayed in Arabic and access is denied.
3. **Given** an authenticated owner on the dashboard, **When** they view the page, **Then** they see today's total sales, cash in hand, net profit, outstanding customer debt, outstanding supplier debt, top products, slow products, and expiring/expired item alerts.

---

### User Story 2 - Cashier Login & POS Sales (Priority: P1)

A cashier logs in and is taken directly to the POS screen. They search for products by scanning a barcode with the device camera, typing a barcode number, or searching by Arabic/English product name with partial/fuzzy matching. When a product is found, the cashier confirms the quantity before adding it to the cart (e.g., selling 2 strips from a 10-strip pack). The cart displays all added items with editable quantities. The cashier cannot change the selling price but may apply a per-item discount or a whole-invoice discount. At checkout, the cashier selects a payment mode: full cash, full credit (pay later), or partial payment. For cash-only fully-paid sales, no customer attachment is required. If any amount remains unpaid, the system requires attaching a customer record (name required, phone optional).

**Why this priority**: The POS is the core daily operation — cashiers use it for every transaction. Without this, the pharmacy cannot conduct business through the system.

**Independent Test**: Can be tested by logging in as a cashier, searching for a product, adding it to the cart with a confirmed quantity, applying a discount, completing a cash sale, and verifying the invoice is saved.

**Acceptance Scenarios**:

1. **Given** a cashier is on the POS screen, **When** they scan a barcode via camera, **Then** the matching product is displayed with its name, price, and available stock.
2. **Given** a cashier is on the POS screen, **When** they type a partial Arabic product name, **Then** matching products appear as search results with fuzzy matching.
3. **Given** a product is found, **When** the cashier selects it, **Then** they must confirm the quantity before it is added to the cart.
4. **Given** items are in the cart, **When** the cashier edits a quantity, **Then** the cart totals update immediately.
5. **Given** items are in the cart, **When** the cashier applies a per-item discount (amount or percentage), **Then** the item subtotal and invoice total reflect the discount.
6. **Given** items are in the cart, **When** the cashier applies an invoice-level discount, **Then** the total reflects the discount distributed across the invoice.
7. **Given** a fully-paid cash sale, **When** the cashier completes checkout, **Then** the invoice is saved without requiring a customer record.
8. **Given** a partially-paid or credit sale, **When** the cashier completes checkout, **Then** the system requires attaching a customer (name required, phone optional) before saving.
9. **Given** a completed sale, **When** stock is deducted, **Then** the system uses FEFO (First Expiry, First Out) logic, consuming pharmacy-floor stock from the earliest-expiring valid batch first.

---

### User Story 3 - Product Catalog & Stock Management (Priority: P2)

The owner creates and manages products in the catalog. Each product has a barcode (one-to-one with a sellable SKU), Arabic name, English name, image URL, manufacturer, category, description, active ingredient, dosage form, route, uses, pharmacology, purchase price, selling price, stock quantity, availability status, batch number, and expiration date. Custom items without barcodes can be created and reused. The visible stock view shows a simple product-level summary, but the system internally tracks batch-level quantities and costs (each batch has its own unit cost and expiration date). The owner can manually adjust stock quantities. The system alerts for expired items, expiring-soon items (configurable threshold), low stock, and out-of-stock conditions.

**Why this priority**: Products are the foundation — POS and all other features depend on having a populated catalog with accurate stock data.

**Independent Test**: Can be tested by creating a product with all fields, adding multiple batches with different expiration dates and costs, verifying the product-level summary is correct, and triggering stock alerts by setting thresholds.

**Acceptance Scenarios**:

1. **Given** an owner on the product management screen, **When** they create a new product with all required fields, **Then** the product is saved and appears in the catalog.
2. **Given** a product with no barcode, **When** the owner creates it as a custom item, **Then** it is saved in the catalog and can be searched and sold like any other product.
3. **Given** a product with multiple batches, **When** the owner views stock details, **Then** they see the aggregated product-level stock quantity, but the system maintains separate batch records internally.
4. **Given** a configurable "expiring soon" threshold (e.g., 90 days), **When** a batch's expiration date falls within the threshold, **Then** the system generates an expiring-soon alert.
5. **Given** a product's total stock falls below its low-stock threshold, **When** the alert system runs, **Then** a low-stock alert is displayed.
6. **Given** an owner on the stock management screen, **When** they perform a manual stock adjustment, **Then** the adjustment is applied and logged in the audit trail.

---

### User Story 4 - Supplier Purchasing & Invoice Management (Priority: P2)

The owner records supplier invoices containing supplier details (name, phone, address, contact person, notes), invoice number, date, and line items (product, quantity, unit price, batch number, expiration date). A single supplier invoice may include the same product in multiple batches with different expiration dates. Logging a supplier invoice automatically adds stock to the system (to the warehouse by default). Supplier payments can be full, partial, or spread over multiple payments over time. The system tracks outstanding balances per supplier and per invoice. The owner can process supplier returns, and can edit or void saved supplier invoices (with stock adjustments applied automatically).

**Why this priority**: Without supplier purchasing, there is no stock to sell. This is the primary stock inflow mechanism and directly impacts profit tracking accuracy.

**Independent Test**: Can be tested by creating a supplier, recording a purchase invoice with multiple batches, verifying stock is updated, making a partial payment, and checking the outstanding balance.

**Acceptance Scenarios**:

1. **Given** an owner on the supplier invoice screen, **When** they record a new invoice with products and batches, **Then** the invoice is saved and stock quantities are automatically updated.
2. **Given** a supplier invoice with two batches of the same product (different expiration dates), **When** the invoice is saved, **Then** two separate batch records are created with their respective quantities and costs.
3. **Given** a saved supplier invoice, **When** the owner makes a partial payment, **Then** the remaining balance is tracked per invoice and the supplier's total outstanding balance is updated.
4. **Given** a saved supplier invoice, **When** the owner voids it, **Then** the associated stock is reversed and the financial records are updated.
5. **Given** a supplier return, **When** the owner records it, **Then** stock is deducted from the relevant batches and the supplier's balance is adjusted.

---

### User Story 5 - Customer Debt Tracking & Payments (Priority: P3)

When a sale is partially paid or fully on credit, a customer record is attached. The customer profile shows the total owed amount, list of unpaid invoices, and full payment history. A single customer payment can settle multiple unpaid invoices (the system distributes the payment across outstanding invoices, oldest first). Customer records are minimal: name is required, phone is optional.

**Why this priority**: Debt tracking is critical for pharmacies that extend credit to regular customers. Without it, the owner loses visibility into receivables.

**Independent Test**: Can be tested by creating a credit sale attached to a customer, verifying the customer profile shows the debt, making a payment that covers part of two invoices, and verifying balances update correctly.

**Acceptance Scenarios**:

1. **Given** a credit sale is completed, **When** the cashier attaches a customer, **Then** the customer's profile reflects the new unpaid invoice and updated total owed.
2. **Given** a customer with multiple unpaid invoices, **When** the customer makes a single payment, **Then** the payment is distributed across invoices (oldest first) and balances are updated accordingly.
3. **Given** a customer profile, **When** the owner views it, **Then** they see the total owed amount, a list of all unpaid invoices, and a complete payment history.

---

### User Story 6 - Warehouse & Pharmacy-Floor Stock Transfers (Priority: P3)

The system maintains separate stock balances for warehouse and pharmacy-floor for each product. Only pharmacy-floor stock can be sold through POS. Authorized users can directly transfer stock between warehouse and pharmacy floor without an approval workflow. Each transfer must include a reason (e.g., restock pharmacy, return to warehouse, damaged items). Supplier invoice stock is received into the warehouse by default.

**Why this priority**: Separating warehouse and floor stock provides accurate visibility into what is available for sale and supports physical inventory organization.

**Independent Test**: Can be tested by receiving stock into the warehouse via a supplier invoice, transferring a quantity to pharmacy floor, attempting a POS sale, and verifying only floor stock is consumed.

**Acceptance Scenarios**:

1. **Given** stock exists in the warehouse, **When** an authorized user transfers a quantity to the pharmacy floor with a reason, **Then** the warehouse balance decreases and the pharmacy-floor balance increases by the same amount.
2. **Given** stock on the pharmacy floor, **When** a sale is made through POS, **Then** only pharmacy-floor stock is consumed.
3. **Given** a transfer is created, **When** it is saved, **Then** the reason is recorded and the transfer appears in the audit log.
4. **Given** damaged items on the floor, **When** a user transfers them back to the warehouse with reason "damaged items," **Then** the floor balance decreases and the warehouse balance increases.

---

### User Story 7 - Refunds & Sale Cancellations (Priority: P3)

Cashiers can cancel a saved sale. Refunds can be created with or without referencing the original invoice. When a refund is processed, the refunded items are automatically returned to inventory (pharmacy-floor stock). If the original sale was on credit, the refund adjusts the customer's outstanding balance.

**Why this priority**: Refunds and cancellations are essential for handling mistakes and customer returns, and they must correctly reverse stock and financial records.

**Independent Test**: Can be tested by creating a sale, issuing a refund (both with and without original invoice reference), and verifying stock is restored and financial records are adjusted.

**Acceptance Scenarios**:

1. **Given** a completed sale, **When** a cashier cancels it, **Then** all stock is returned to inventory and the invoice is marked as cancelled.
2. **Given** a refund with a reference to the original invoice, **When** it is processed, **Then** the refunded items' stock is restored and the refund is linked to the original sale.
3. **Given** a refund without an original invoice reference, **When** it is processed, **Then** the refunded items' stock is restored and a standalone refund record is created.
4. **Given** a credit sale that is refunded, **When** the refund is processed, **Then** the customer's outstanding balance is reduced accordingly.

---

### User Story 8 - Reports & Analytics (Priority: P4)

The owner accesses detailed reports including total sales, net profit (based on actual batch-level COGS), cash in hand, outstanding customer debt, outstanding supplier debt, top-selling products, slow-moving products, and expired/expiring items. Reports support filters: today, yesterday, this week, this month, and custom date range. Reports support month-over-month and year-over-year comparisons. All major reports can be exported to Excel.

**Why this priority**: Reporting provides the owner with strategic business insight. While important, it depends on data from POS, stock, and purchasing modules being in place first.

**Independent Test**: Can be tested by generating sales and purchase data over a time period, running each report type with various date filters, verifying calculations match expected values, and exporting to Excel.

**Acceptance Scenarios**:

1. **Given** sales data exists, **When** the owner views the sales report filtered by "this week," **Then** only sales within the current week are shown with correct totals.
2. **Given** profit data exists, **When** the owner views net profit, **Then** the calculation uses actual batch-level cost of goods sold (FEFO-based), not averaged costs.
3. **Given** any major report is displayed, **When** the owner clicks export, **Then** the report data is downloaded as an Excel file.
4. **Given** data spanning multiple months, **When** the owner selects month-over-month comparison, **Then** the report displays side-by-side metrics for the selected months.

---

### User Story 9 - Inventory Audit & Stock Counting (Priority: P4)

The owner initiates an inventory audit session for stock counting. During the session, actual physical counts are recorded for each product. The system compares physical counts against system quantities and highlights discrepancies. The owner can approve adjustments to reconcile the system stock with the physical count.

**Why this priority**: Periodic stock verification ensures system accuracy and catches shrinkage, damage, or data entry errors. It is operationally important but not a daily activity.

**Independent Test**: Can be tested by starting an audit session, entering counts for several products (some matching, some not), reviewing discrepancies, and approving adjustments.

**Acceptance Scenarios**:

1. **Given** an owner starts an audit session, **When** they enter a physical count for a product, **Then** the system displays the expected quantity alongside the entered count and highlights any discrepancy.
2. **Given** discrepancies are identified, **When** the owner approves adjustments, **Then** the system stock is updated to match the physical count and the adjustment is logged.
3. **Given** an audit session is in progress, **When** the owner pauses and resumes later, **Then** all previously entered counts are preserved.

---

### User Story 10 - Audit Logging & Traceability (Priority: P4)

The system logs all important actions: transfer created, sale created, sale edited, refund created, stock adjusted, supplier invoice created/edited/voided, and customer payment recorded. Audit logs are immutable — once written, they cannot be modified or deleted. Logs are searchable by user, date range, product, invoice number, and action type.

**Why this priority**: Audit trails provide accountability and are essential for business integrity, but they are a background system capability rather than a user-facing workflow.

**Independent Test**: Can be tested by performing various auditable actions (sale, refund, stock adjustment), then searching the audit log by each filter type and verifying entries are accurate and cannot be modified.

**Acceptance Scenarios**:

1. **Given** a sale is created, **When** the action completes, **Then** an immutable audit log entry is recorded with the user, timestamp, action type, and relevant details.
2. **Given** audit log entries exist, **When** the owner searches by a specific user and date range, **Then** only matching entries are returned.
3. **Given** audit log entries exist, **When** any user attempts to modify or delete an entry, **Then** the system prevents the modification.

---

### User Story 11 - User Management & Permissions (Priority: P4)

The owner can create user accounts and assign roles (owner or cashier). The owner can modify permissions for each user. Cashiers are restricted to POS operations and cannot access management features like reports, product management, or supplier purchasing unless granted permission.

**Why this priority**: User management enables multi-user operation and access control, but a single-owner setup can function initially.

**Independent Test**: Can be tested by creating a cashier account, logging in as that cashier, and verifying restricted access to management features.

**Acceptance Scenarios**:

1. **Given** an owner on the user management screen, **When** they create a new cashier account, **Then** the cashier can log in and is directed to the POS screen.
2. **Given** a cashier account, **When** the cashier tries to access management features (e.g., reports, product management), **Then** access is denied with an appropriate message.
3. **Given** an owner modifies a cashier's permissions, **When** the cashier next accesses the system, **Then** their access reflects the updated permissions.

---

### Edge Cases

- What happens when a product's stock reaches zero during checkout (item already in cart but stock depleted by another concurrent sale)?
- How does the system handle a barcode scan that matches no product in the catalog?
- What happens when all batches of a product are expired and a cashier attempts to sell it? → The POS displays a warning; the cashier may confirm to proceed.
- What happens if a supplier invoice is voided after some of that stock has already been sold?
- How does the system handle a customer payment that exceeds the total owed amount?
- What happens when a refund is issued for a quantity greater than what was originally sold?
- How does the system handle a stock transfer when the source location has insufficient quantity?
- What happens when an audit session finds products in the physical store that do not exist in the catalog?
- How does the system handle concurrent users editing the same supplier invoice?
- What happens when a discount exceeds the item price (resulting in a negative total)?

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Access Control**

- **FR-001**: System MUST authenticate all users before granting access to any functionality.
- **FR-002**: System MUST support two user roles: owner and cashier.
- **FR-003**: Owner role MUST have full access to all system features including user management, product management, supplier management, stock management, reports, and settings.
- **FR-004**: Cashier role MUST be restricted to POS operations by default, with additional permissions configurable by the owner.
- **FR-005**: Owner MUST be able to create, edit, and deactivate user accounts.
- **FR-006**: After login, owners MUST be directed to the dashboard; cashiers MUST be directed to the POS screen.

**Point of Sale**

- **FR-007**: System MUST support product search by barcode scan (device camera), typed barcode number, Arabic name, English name, and partial/fuzzy text matching.
- **FR-008**: Each barcode MUST map one-to-one to a single sellable product SKU.
- **FR-009**: System MUST require the cashier to confirm quantity before adding a product to the cart.
- **FR-010**: Cart items MUST have editable quantities, and cart totals MUST update in real time.
- **FR-011**: Cashiers MUST NOT be able to manually change the selling price of a product during checkout.
- **FR-012**: System MUST support per-item discounts (fixed amount or percentage) and invoice-level discounts. Cashiers may apply discounts freely up to the owner-configured maximum discount percentage; no approval workflow is required.
- **FR-013**: System MUST support three payment modes: full cash, full credit (deferred payment), and partial payment (with remaining balance due later).
- **FR-014**: Fully-paid cash sales MUST be saveable without attaching a customer record.
- **FR-015**: Sales with any unpaid balance MUST require a customer record (name required, phone optional).
- **FR-016**: Cashiers MUST be able to cancel a saved sale, which reverses stock and financial effects.

**Products & Stock**

- **FR-017**: System MUST store product data including: barcode, Arabic name, English name, image URL, manufacturer, category, description, active ingredient, dosage form, route, uses, pharmacology, purchase price, selling price, base unit, sellable sub-unit (optional), sub-unit conversion factor, stock quantity, availability, batch number, and expiration date. Stock is tracked in base units; the POS allows selling in either base unit or sub-unit.
- **FR-018**: System MUST support creating custom products without a barcode, reusable across future transactions.
- **FR-019**: The product-level stock view MUST display a simple aggregated quantity, while the system internally maintains batch-level records with individual quantities, costs, and expiration dates.
- **FR-020**: Sales MUST deplete stock using FEFO (First Expiry, First Out), consuming from the earliest-expiring valid batch of pharmacy-floor stock first.
- **FR-020a**: When a cashier attempts to sell an expired product, the POS MUST display a clear warning but MUST allow the cashier to confirm and proceed with the sale.
- **FR-021**: System MUST generate alerts for: expired items, expiring-soon items, low stock, and out-of-stock conditions.
- **FR-022**: The "expiring soon" threshold MUST be configurable by the owner (e.g., 30, 60, 90 days).
- **FR-023**: Owner MUST be able to perform manual stock adjustments with a recorded reason.
- **FR-024**: System MUST support inventory audit sessions where physical counts are recorded, discrepancies are highlighted, and approved adjustments update system stock.

**Warehouse Management**

- **FR-025**: System MUST maintain separate stock balances for warehouse and pharmacy-floor locations per product per batch.
- **FR-026**: Only pharmacy-floor stock MUST be available for sale through POS.
- **FR-027**: Authorized users MUST be able to transfer stock between warehouse and pharmacy floor without an approval workflow.
- **FR-028**: Each stock transfer MUST include a reason (e.g., restock pharmacy, return to warehouse, damaged items).

**Supplier Purchasing**

- **FR-029**: System MUST record supplier profiles with: name, phone, address, contact person, and notes.
- **FR-030**: System MUST record supplier invoices with: invoice number, date, supplier reference, and line items (product, quantity, unit cost, batch number, expiration date).
- **FR-031**: A single supplier invoice MUST support multiple batches of the same product with different expiration dates.
- **FR-032**: Saving a supplier invoice MUST automatically add stock to the system.
- **FR-033**: System MUST support supplier payments (full, partial, or multiple payments over time) and track outstanding balances per invoice and per supplier.
- **FR-033a**: Owner MUST be able to manually adjust supplier balances (increase or decrease) with a mandatory reason. All adjustments MUST be recorded in the immutable audit trail.
- **FR-034**: System MUST support supplier returns with corresponding stock and balance adjustments.
- **FR-035**: Owner MUST be able to edit or void a saved supplier invoice, with stock automatically adjusted.

**Customer Debt Management**

- **FR-036**: Customer records MUST include name (required) and phone (optional).
- **FR-037**: Customer profile MUST display: total owed amount, list of unpaid invoices, and payment history.
- **FR-038**: A single customer payment MUST be able to settle multiple unpaid invoices, applied oldest-first.
- **FR-038a**: Owner MUST be able to manually adjust customer balances (increase or decrease) with a mandatory reason. All adjustments MUST be recorded in the immutable audit trail.
- **FR-039**: System MUST support refunds with or without reference to the original invoice. Cashiers may issue refunds of any amount without owner approval.
- **FR-040**: Refunds MUST automatically return stock to pharmacy-floor inventory.

**Reporting & Analytics**

- **FR-041**: Owner dashboard MUST display: total sales, cash in hand, net profit, outstanding customer debt, outstanding supplier debt, top-selling products, slow-moving products, and expiring/expired items.
- **FR-042**: Reports MUST support date filters: today, yesterday, this week, this month, and custom date range.
- **FR-043**: Reports MUST support month-over-month and year-over-year comparisons.
- **FR-044**: All major reports MUST be exportable to Excel format.

**Profit Calculation**

- **FR-045**: Profit MUST be calculated using batch-level cost tracking with perpetual inventory and FEFO batch depletion.
- **FR-046**: Each purchase batch MUST retain its own unit cost and expiration date for COGS calculation.
- **FR-047**: Net profit MUST be based on actual cost of goods sold from the specific batches consumed, not averaged or estimated costs.

**Audit Logging**

- **FR-048**: System MUST log all important actions including: sale created, sale edited, sale cancelled, refund created, stock adjusted, transfer created, supplier invoice created/edited/voided, customer payment recorded, and manual balance adjustments (customer or supplier).
- **FR-049**: Audit logs MUST be immutable — entries cannot be modified or deleted after creation.
- **FR-050**: Audit logs MUST be searchable by user, date range, product, invoice number, and action type.

**Localization & Interface**

- **FR-051**: The entire user interface MUST be in Arabic, with right-to-left (RTL) layout, suitable for Egyptian Arabic-speaking users.
- **FR-052**: System MUST be a web-based application accessible via standard browsers, with no offline mode required.

**System Settings**

- **FR-053**: Owner MUST be able to configure system settings including: expiring-soon threshold, low-stock thresholds, and discount limits.
- **FR-054**: Owner MUST be able to initiate system data backups.

### Key Entities

- **User**: Represents a system operator. Has a role (owner or cashier), credentials, and configurable permissions. Performs auditable actions.
- **Product**: A sellable item in the catalog. Identified by barcode (or system-generated ID for custom items). Contains descriptive, pharmaceutical, and pricing information. Defines a base unit (purchase/stock unit) and an optional sellable sub-unit with a conversion factor (e.g., box→strip, factor=10). Aggregates stock from multiple batches in base units.
- **Batch**: A specific purchase lot of a product. Tracks unit cost, quantity, expiration date, and location (warehouse or pharmacy floor). Used for FEFO depletion and accurate COGS.
- **Sale Invoice**: A completed point-of-sale transaction. Contains line items (product, quantity, unit price, discount, batch cost consumed), payment details, optional customer reference, and timestamps.
- **Customer**: A person who has purchased on credit. Minimal record (name, phone). Links to unpaid invoices and payment history. Tracks total owed amount.
- **Customer Payment**: A payment made by a customer to settle outstanding invoices. May cover multiple invoices, applied oldest-first.
- **Supplier**: A vendor who provides products. Contains contact information and tracks outstanding balance.
- **Supplier Invoice**: A purchase record from a supplier. Contains line items with batch-level detail (quantity, cost, expiration). Drives stock inflow and supplier balance tracking.
- **Supplier Payment**: A payment made to a supplier against outstanding invoices.
- **Stock Transfer**: A movement of stock between warehouse and pharmacy floor. Contains product, batch, quantity, direction, reason, and timestamp.
- **Refund**: A reversal of a sale (full or partial), with or without original invoice reference. Restores stock to inventory and adjusts financial records.
- **Audit Log Entry**: An immutable record of a significant system action. Contains user, timestamp, action type, affected entity, and details.
- **Inventory Audit Session**: A periodic stock-counting exercise. Contains counted items, expected vs. actual quantities, discrepancies, and approved adjustments.
- **System Settings**: Configurable parameters including expiring-soon threshold, low-stock thresholds, and discount limits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cashiers can complete a standard sale (search product, add to cart, checkout) in under 60 seconds for a single-item transaction.
- **SC-002**: Product search returns results within 1 second for a catalog of up to 10,000 products.
- **SC-003**: All financial calculations (invoice totals, profit, outstanding balances) are accurate to the piaster (0.01 EGP) with zero rounding discrepancies.
- **SC-004**: The system correctly applies FEFO depletion for 100% of sales — no batch is consumed while an earlier-expiring valid batch of the same product has remaining stock.
- **SC-005**: Expiring-soon, expired, low-stock, and out-of-stock alerts are generated within 1 minute of the triggering condition and are visible to the owner on the dashboard.
- **SC-006**: All audit log entries are immutable and accurately reflect the action performed, with zero data loss across system operations.
- **SC-007**: Customer and supplier outstanding balances are always consistent with the sum of their related unpaid invoices — zero balance discrepancies.
- **SC-008**: Report generation for any standard report completes in under 5 seconds for up to 1 year of transaction data.
- **SC-009**: Excel exports accurately reflect all data shown in the corresponding on-screen report.
- **SC-010**: 100% of the user interface is rendered in Arabic with correct RTL layout — no untranslated elements visible to end users.
- **SC-011**: Refunds correctly restore stock to inventory and adjust all related financial records (customer balance, profit calculations) with zero inconsistencies.
- **SC-012**: Stock quantities across warehouse and pharmacy floor always sum correctly to total product stock — no orphaned or unaccounted quantities.

## Assumptions

- **Authentication**: Standard email/password authentication is sufficient; no SSO or third-party authentication is required.
- **Currency**: All monetary values are in Egyptian Pounds (EGP).
- **Concurrent users**: The system is designed for a single-pharmacy operation with up to 5 concurrent users (1 owner + up to 4 cashiers).
- **Backup**: System backup refers to the ability for the owner to trigger an export/backup of business data; infrastructure-level backups are handled by the hosting platform.
- **Product variants**: Flat catalog — each variant (e.g., different dosage, pack size) is an independent product entry with its own barcode, SKU, name, price, and stock. No parent-child grouping.
- **Low-stock threshold**: Configurable per product, defaulting to a system-wide setting.
- **Supplier invoice stock destination**: New stock from supplier invoices is received into the warehouse by default; the user then transfers to pharmacy floor as needed.
- **Customer payment allocation**: When a payment covers multiple invoices, it is applied to the oldest unpaid invoice first (FIFO).
- **Discount limits**: The system prevents discounts from exceeding the item price (no negative totals). The owner can configure maximum discount percentages.
- **Barcode camera scanning**: Uses the device's built-in camera; no external scanner hardware integration is required (though typed barcode entry supports external USB scanners indirectly).
