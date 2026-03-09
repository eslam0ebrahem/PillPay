# Tasks: Pharmacy POS & Management System

**Input**: Design documents from `/specs/001-pharmacy-pos-system/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/api.md, contracts/permissions.md

**Tests**: Not explicitly requested in feature specification — test tasks are omitted.

**Organization**: Tasks are grouped by user story (US1–US11) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create Next.js 16 project with all dependencies and configuration

- [ ] T001 Initialize Next.js 16 project with TypeScript and React 19, install all dependencies (mongoose, antd, @ant-design/nextjs-registry, @tanstack/react-query, html5-qrcode, exceljs, zod, bcrypt, jsonwebtoken, cookie) and dev dependencies (@types/bcrypt, @types/jsonwebtoken, @types/cookie) in package.json
- [ ] T002 [P] Configure TypeScript in tsconfig.json with strict mode, path aliases (`@/*` → `./src/*`), and App Router settings
- [ ] T003 [P] Create .env.local.example with MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN, SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_OWNER_NAME, NEXT_PUBLIC_APP_NAME
- [ ] T004 [P] Configure Next.js in next.config.ts with serverExternalPackages for mongoose, bcrypt, jsonwebtoken, and exceljs
- [ ] T005 Create project directory structure per plan.md: src/app/(auth)/login, src/app/(dashboard)/products/[id], src/app/(dashboard)/customers/[id], src/app/(dashboard)/suppliers/[id], src/app/(dashboard)/supplier-invoices/new, src/app/(dashboard)/stock/audit, src/app/(dashboard)/reports, src/app/(dashboard)/audit-logs, src/app/(dashboard)/users, src/app/(dashboard)/settings, src/app/pos, src/app/api/auth/login, src/app/api/auth/refresh, src/app/api/auth/me, src/app/api/auth/logout, src/lib/db, src/lib/models, src/lib/services, src/lib/auth, src/lib/utils, src/lib/types, src/components/layout, src/components/pos, src/components/products, src/components/customers, src/components/suppliers, src/components/stock, src/components/reports, src/components/common, src/hooks, src/i18n, src/utils, tests/unit, tests/integration, tests/fixtures, public

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Utilities

- [ ] T006 Create MongoDB connection singleton with globalThis caching for Next.js hot reload survival in src/lib/db/connection.ts
- [ ] T007 [P] Define shared TypeScript types and interfaces (UserRole, Permission keys, PaymentMode, DiscountObj, PaginationParams, ApiErrorResponse, etc.) in src/lib/types/index.ts
- [ ] T008 [P] Create piaster-based money helpers (toPiasters, toEGP, formatMoney with ج.م suffix, calcDiscountAmount, calcSubtotal) in src/lib/utils/money.ts
- [ ] T009 [P] Create client-side money display helper (formatEGP, formatPiasters) in src/utils/money.ts
- [ ] T010 [P] Create client-side unit conversion helpers (convertToBaseUnits, convertFromBaseUnits, getDisplayUnit) in src/utils/units.ts
- [ ] T011 [P] Create sequential number generator (generateInvoiceNumber INV-YYYYMMDD-NNNN, generateRefundNumber REF-YYYYMMDD-NNNN) using MongoDB counter pattern in src/lib/utils/invoiceNumber.ts
- [ ] T012 [P] Create shared Zod validation schemas (loginSchema, productSchema, customerSchema, supplierSchema, checkoutSchema, transferSchema, refundSchema, settingsSchema) in src/lib/utils/validation.ts
- [ ] T013 [P] Create Arabic UI string constants for all labels, buttons, messages, errors, navigation items, and placeholders in src/i18n/ar.ts

### Core Models

- [ ] T014 Create User model with schema (email unique, passwordHash, name, role enum owner/cashier, permissions array, isActive default true, timestamps) and pre-save hook for password hashing in src/lib/models/User.ts
- [ ] T015 [P] Create Product model with schema (barcode sparse unique, nameAr required, nameEn, imageUrl, manufacturer, category, description, activeIngredient, dosageForm, route, uses, pharmacology, sellingPrice, baseUnit, subUnit, subUnitConversionFactor, lowStockThreshold, isActive, timestamps) with text index on nameAr/nameEn and sparse barcode index in src/lib/models/Product.ts
- [ ] T016 [P] Create Batch model with schema (productId ref, batchNumber, expirationDate, purchasePrice, warehouseQty, floorQty, supplierInvoiceId ref, createdAt) with compound indexes for FEFO queries (productId+expirationDate, productId+floorQty) in src/lib/models/Batch.ts
- [ ] T017 [P] Create Customer model with schema (name required, phone sparse, totalOwed default 0, timestamps) with text index on name in src/lib/models/Customer.ts
- [ ] T018 [P] Create Settings singleton model (_id fixed "global", expiringSoonDays default 90, defaultLowStockThreshold default 10, maxDiscountPercentage default 10000) with upsert helper in src/lib/models/Settings.ts
- [ ] T019 [P] Create AuditLog model with schema (userId ref, action, entityType, entityId, details Mixed, invoiceNumber sparse, productId sparse, timestamp) — expose ONLY create() and find() static methods, block update/delete at model level in src/lib/models/AuditLog.ts
- [ ] T020 Create models barrel export aggregating all models in src/lib/models/index.ts

### Authentication Infrastructure

- [ ] T021 Create JWT helpers (generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken) using jsonwebtoken with env-configured secrets and expiry in src/lib/auth/jwt.ts
- [ ] T022 Create API route auth middleware (withAuth wrapping handler with JWT cookie validation, withPermission checking user.role=owner OR user.permissions.includes) in src/lib/auth/middleware.ts
- [ ] T023 [P] Create session helper (getCurrentUser: extract and verify JWT from cookie, return user or null) for Server Components in src/lib/auth/session.ts
- [ ] T024 Create auth service (login with bcrypt compare, generateTokenPair, seedOwnerOnFirstRun using SEED_OWNER env vars) in src/lib/services/auth.service.ts
- [ ] T025 Create audit service (logAction: create immutable audit log entry with userId, action string, entityType, entityId, details object) in src/lib/services/audit.service.ts
- [ ] T026 [P] Create POST /api/auth/login route handler (validate credentials, set auth-token and refresh-token HTTP-only cookies, return user object) in src/app/api/auth/login/route.ts
- [ ] T027 [P] Create POST /api/auth/refresh route handler (verify refresh cookie, issue new access token cookie) in src/app/api/auth/refresh/route.ts
- [ ] T028 [P] Create GET /api/auth/me route handler (return current user from cookie) in src/app/api/auth/me/route.ts
- [ ] T029 [P] Create POST /api/auth/logout route handler (clear auth-token and refresh-token cookies) in src/app/api/auth/logout/route.ts
- [ ] T030 Create Next.js middleware for auth redirect (unauthenticated→/login) and role-based routing (owner→/dashboard, cashier→/pos) with public path allowlist in src/middleware.ts

### UI Infrastructure

- [ ] T031 Create global CSS with RTL support, logical properties (margin-inline-start, padding-inline-end), Ant Design overrides, and Arabic font stack in src/app/globals.css
- [ ] T032 Create root layout with html lang="ar" dir="rtl", Ant Design ConfigProvider with direction="rtl" and Arabic locale, QueryClientProvider, global CSS import in src/app/layout.tsx
- [ ] T033 Create root page with server-side redirect logic (authenticated owner→/dashboard, cashier→/pos, unauthenticated→/login) in src/app/page.tsx
- [ ] T034 [P] Create MoneyDisplay component (accepts piaster amount, renders formatted EGP with ج.م suffix) in src/components/common/MoneyDisplay.tsx
- [ ] T035 [P] Create PermissionGuard component (accepts permission key, renders children only if current user has permission) in src/components/common/PermissionGuard.tsx
- [ ] T036 [P] Create ArabicInput component (RTL-configured Ant Design Input wrapper with Arabic placeholder support) in src/components/common/ArabicInput.tsx
- [ ] T037 Create useAuth hook (login mutation, logout mutation, getCurrentUser query via /api/auth/me, refresh logic, user state) using TanStack React Query in src/hooks/useAuth.ts
- [ ] T038 [P] Create usePermissions hook (hasPermission check, isOwner check, derived from useAuth user data) in src/hooks/usePermissions.ts
- [ ] T039 Create login page as Client Component with Ant Design Form (email + password inputs), error display, loading state, and post-login redirect in src/app/(auth)/login/page.tsx
- [ ] T040 Create Sidebar component with Arabic navigation links, role-based menu filtering, active route highlighting, and collapsible layout in src/components/layout/Sidebar.tsx
- [ ] T041 [P] Create Header component with user name display, notification badge area, and logout button in src/components/layout/Header.tsx
- [ ] T042 Create AppShell layout composing Sidebar + Header + main content area with responsive behavior in src/components/layout/AppShell.tsx
- [ ] T043 Create authenticated dashboard layout using AppShell with server-side auth check (redirect to /login if unauthenticated) in src/app/(dashboard)/layout.tsx

**Checkpoint**: Foundation ready — authentication, models, utilities, and layout shell are complete. User story implementation can now begin.

---

## Phase 3: User Story 1 — Owner Login & Dashboard (Priority: P1) 🎯 MVP

**Goal**: Owner logs in and sees a business overview dashboard with today's sales, profit, debt summaries, top/slow products, and stock alerts

**Independent Test**: Create owner account via seed, log in, verify dashboard loads with summary cards and alert panels (empty-state placeholders for fresh system)

- [x] T044 [US1] Create alerts service (getExpiredBatches, getExpiringSoonBatches using Settings.expiringSoonDays, getLowStockProducts, getOutOfStockProducts) querying Batch and Product models in src/lib/services/alerts.service.ts
- [x] T045 [US1] Create report service with getDashboardSummary method (today's totalSales, cashInHand, netProfit from batch-level COGS, totalCustomerDebt, totalSupplierDebt, topSellingProducts, slowMovingProducts) using MongoDB aggregation pipelines in src/lib/services/report.service.ts
- [x] T046 [P] [US1] Create DashboardCards component (Ant Design Card grid showing sales, profit, cash, customer debt, supplier debt with MoneyDisplay) in src/components/reports/DashboardCards.tsx
- [x] T047 [P] [US1] Create GET /api/reports/dashboard route handler (withAuth + withPermission reports.view, call report service) in src/app/api/reports/dashboard/route.ts
- [x] T048 [P] [US1] Create GET /api/products/alerts route handler (withAuth + withPermission products.view, call alerts service) in src/app/api/products/alerts/route.ts
- [x] T049 [US1] Create owner dashboard page as Server Component calling report.service.getDashboardSummary and alerts.service directly, rendering DashboardCards + alert lists + top/slow product tables in src/app/(dashboard)/page.tsx

**Checkpoint**: Owner can log in and see full business dashboard — US1 complete

---

## Phase 4: User Story 2 — Cashier Login & POS Sales (Priority: P1) 🎯 MVP

**Goal**: Cashier logs in directly to POS screen, searches products (barcode camera scan, typed barcode, Arabic/English name), builds cart with quantity confirmation and discounts, completes checkout with FEFO batch depletion

**Independent Test**: Log in as cashier, search product, add to cart with quantity, apply per-item and invoice discounts, complete cash sale, verify invoice saved and floor stock depleted via FEFO

- [ ] T050 [US2] Create SaleInvoice model with schema (invoiceNumber unique auto-generated, items[] embedded SaleItem with productId/productNameAr/quantity/unitSold/displayQuantity/unitPrice/discount DiscountObj/subtotal/batchAllocations[] BatchAllocation, subtotal, invoiceDiscount DiscountObj, total, paidAmount, remainingBalance, paymentMode enum cash/credit/partial, customerId nullable ref, cashierId ref, status enum completed/cancelled, timestamps) in src/lib/models/SaleInvoice.ts
- [ ] T051 [US2] Update models barrel export to include SaleInvoice in src/lib/models/index.ts
- [ ] T052 [US2] Create stock service with FEFO depletion (allocateBatchesFEFO: query floor batches sorted by expirationDate asc with floorQty > 0, allocate quantity sequentially; deductFloorStock: atomically decrement batch floorQty) and stock query helpers (getProductFloorStock, getProductWarehouseStock) in src/lib/services/stock.service.ts
- [ ] T053 [US2] Create POS service (searchProducts: text index search + regex fallback for partial match + barcode exact match; checkout: validate stock, apply FEFO allocation, calculate totals with discounts, create SaleInvoice, deduct stock, update customer totalOwed if credit, log audit; validateDiscount against Settings.maxDiscountPercentage) in src/lib/services/pos.service.ts
- [ ] T054 [P] [US2] Create POST /api/pos/search route handler (withAuth + withPermission pos.search, accept query + type barcode/text, return matching products with floor stock and expiry info) in src/app/api/pos/search/route.ts
- [ ] T055 [P] [US2] Create POST /api/pos/checkout route handler (withAuth + withPermission pos.checkout, validate checkout schema, call pos.service.checkout, return created invoice) in src/app/api/pos/checkout/route.ts
- [ ] T056 [US2] Create useBarcodeScan hook wrapping html5-qrcode library (init camera, start/stop scanning, emit decoded barcode string, handle permissions and errors) in src/hooks/useBarcodeScan.ts
- [ ] T057 [P] [US2] Create BarcodeScanner component (Ant Design Modal with camera viewport, uses useBarcodeScan, emits scanned code to parent) in src/components/pos/BarcodeScanner.tsx
- [ ] T058 [US2] Create ProductSearch component (search input with debounce, barcode scan button triggering BarcodeScanner, results list with product name/price/stock, quantity confirmation modal before adding to cart) in src/components/pos/ProductSearch.tsx
- [ ] T059 [US2] Create Cart component (Ant Design Table of cart items with editable quantity, unit toggle base/sub, per-item discount inputs amount/percentage, invoice-level discount, running subtotal and total with MoneyDisplay, remove item button) in src/components/pos/Cart.tsx
- [ ] T060 [US2] Create Checkout component (payment mode radio cash/credit/partial, paid amount input for partial, customer search/create for credit/partial, expired product warning with override confirm, final confirmation dialog) in src/components/pos/Checkout.tsx
- [ ] T061 [US2] Create POSScreen component composing ProductSearch + Cart + Checkout as full Client Component with cart state management, search→add→checkout flow in src/components/pos/POSScreen.tsx
- [ ] T062 [US2] Create POS layout with minimal chrome (no sidebar, compact header with logout only) in src/app/pos/layout.tsx
- [ ] T063 [US2] Create POS page rendering POSScreen Client Component in src/app/pos/page.tsx

**Checkpoint**: Cashier can log in, search products, build cart, and complete sales with FEFO stock depletion — US2 complete

---

## Phase 5: User Story 3 — Product Catalog & Stock Management (Priority: P2)

**Goal**: Owner manages product catalog (create, edit, view), sees batch-level stock details, receives stock alerts, performs manual stock adjustments

**Independent Test**: Create product with all fields, view in catalog, check batch details, set low-stock threshold, verify alert triggers, perform manual stock adjustment

- [x] T064 [P] [US3] Create ProductForm component (Ant Design Form with all product fields: barcode, nameAr, nameEn, imageUrl, manufacturer, category, description, activeIngredient, dosageForm, route, uses, pharmacology, sellingPrice in EGP with piaster conversion, baseUnit, subUnit, subUnitConversionFactor, lowStockThreshold, isActive toggle) in src/components/products/ProductForm.tsx
- [x] T065 [P] [US3] Create ProductList component (Ant Design Table with search, category filter, stock status badges for low/out/expired, pagination) in src/components/products/ProductList.tsx
- [x] T066 [P] [US3] Create BatchViewer component (Ant Design Table showing batch number, expiration date, warehouse qty, floor qty, purchase price, status badges for expired/expiring-soon) in src/components/products/BatchViewer.tsx
- [x] T067 [US3] Create GET (list with search, category filter, isActive filter, pagination) and POST (create with validation) handlers for /api/products in src/app/api/products/route.ts
- [x] T068 [US3] Create GET (full product with aggregated stock + batch list) and PUT (update with validation) handlers for /api/products/:id in src/app/api/products/[id]/route.ts
- [x] T069 [US3] Create POST /api/stock/adjustments route handler (withPermission stock.adjust, validate productId+batchId+location+newQuantity+reason, update batch qty, log audit) in src/app/api/stock/adjustments/route.ts
- [x] T070 [US3] Create product list page as Server Component (call Product.find directly, render ProductList) in src/app/(dashboard)/products/page.tsx
- [x] T071 [US3] Create product detail page as Server Component (product info + ProductForm for editing + BatchViewer + stock adjustment controls) in src/app/(dashboard)/products/[id]/page.tsx
- [x] T072 [US3] Create stock overview page showing all products with stock levels, alert panels (expired, expiring-soon, low stock, out of stock), and manual adjustment form in src/app/(dashboard)/stock/page.tsx

**Checkpoint**: Full product catalog CRUD with batch-level stock visibility and alerts — US3 complete

---

## Phase 6: User Story 4 — Supplier Purchasing & Invoice Management (Priority: P2)

**Goal**: Owner manages suppliers, records purchase invoices (auto-creates warehouse batches), makes payments, processes returns, edits/voids invoices

**Independent Test**: Create supplier, record invoice with 2 batches of same product (different expiry), verify warehouse stock added, make partial payment, check supplier balance, void invoice and verify stock reversed

- [x] T073 [P] [US4] Create Supplier model with schema (name required, phone, address, contactPerson, notes, totalOwed default 0, timestamps) with text index on name in src/lib/models/Supplier.ts
- [x] T074 [P] [US4] Create SupplierInvoice model with schema (invoiceNumber, supplierId ref, date, items[] embedded SupplierInvoiceItem with productId/batchNumber/expirationDate/quantity/unitCost/lineTotal, total, paidAmount, remainingBalance, status enum active/voided, notes, timestamps) in src/lib/models/SupplierInvoice.ts
- [x] T075 [P] [US4] Create SupplierPayment model with schema (supplierId ref, supplierInvoiceId ref nullable, amount, paidBy ref, createdAt) in src/lib/models/SupplierPayment.ts
- [x] T076 [P] [US4] Create SupplierReturn model with schema (supplierId ref, supplierInvoiceId ref nullable, items[] embedded ReturnItem with productId/batchId/quantity/unitCost/lineTotal, total, processedBy ref, createdAt) in src/lib/models/SupplierReturn.ts
- [x] T077 [US4] Update models barrel export to include Supplier, SupplierInvoice, SupplierPayment, SupplierReturn in src/lib/models/index.ts
- [x] T078 [US4] Create supplier service (createInvoice: create invoice + create Batch documents with warehouseQty for each item + update supplier.totalOwed; editInvoice: adjust batches to match updated items; voidInvoice: check no sold stock, reverse batches, update balance; recordPayment: create SupplierPayment, update invoice.paidAmount + supplier.totalOwed; processReturn: deduct batch stock, create SupplierReturn, adjust supplier balance; all operations log audit) in src/lib/services/supplier.service.ts
- [x] T079 [P] [US4] Create GET (list with search, pagination) and POST (create with validation) handlers for /api/suppliers in src/app/api/suppliers/route.ts
- [x] T080 [P] [US4] Create GET (profile with invoices, payments, returns) and PUT (update) handlers for /api/suppliers/:id in src/app/api/suppliers/[id]/route.ts
- [x] T081 [P] [US4] Create POST /api/suppliers/:id/adjustments route handler (withPermission balance.adjust, manual balance adjustment with reason) in src/app/api/suppliers/[id]/adjustments/route.ts
- [x] T082 [US4] Create GET (list with supplierId filter, status filter, pagination) and POST (create invoice, call supplier.service.createInvoice) handlers for /api/supplier-invoices in src/app/api/supplier-invoices/route.ts
- [x] T083 [US4] Create GET (full invoice details) and PUT (edit invoice, call supplier.service.editInvoice) handlers for /api/supplier-invoices/:id in src/app/api/supplier-invoices/[id]/route.ts
- [x] T084 [P] [US4] Create POST /api/supplier-invoices/:id/void route handler (call supplier.service.voidInvoice, return 409 if stock already sold) in src/app/api/supplier-invoices/[id]/void/route.ts
- [x] T085 [P] [US4] Create POST /api/supplier-invoices/:id/payments route handler (call supplier.service.recordPayment) in src/app/api/supplier-invoices/[id]/payments/route.ts
- [x] T086 [P] [US4] Create POST /api/supplier-returns route handler (call supplier.service.processReturn) in src/app/api/supplier-returns/route.ts
- [x] T087 [P] [US4] Create SupplierForm component (Ant Design Form: name, phone, address, contactPerson, notes) in src/components/suppliers/SupplierForm.tsx
- [x] T088 [P] [US4] Create InvoiceForm component (supplier selector, invoice number, date picker, dynamic line items table with product search + batchNumber + expirationDate + quantity + unitCost, auto-calculated totals) in src/components/suppliers/InvoiceForm.tsx
- [x] T089 [P] [US4] Create SupplierProfile component (balance summary with MoneyDisplay, invoice list with status badges, payment history, adjustment history) in src/components/suppliers/SupplierProfile.tsx
- [x] T090 [US4] Create supplier list page as Server Component in src/app/(dashboard)/suppliers/page.tsx
- [x] T091 [US4] Create supplier detail page with SupplierProfile, payment recording, and adjustment controls in src/app/(dashboard)/suppliers/[id]/page.tsx
- [x] T092 [US4] Create supplier invoice list page with filters in src/app/(dashboard)/supplier-invoices/page.tsx
- [x] T093 [US4] Create new supplier invoice page with InvoiceForm in src/app/(dashboard)/supplier-invoices/new/page.tsx

**Checkpoint**: Full supplier lifecycle — create supplier, record invoices (auto-stock), payments, returns, edit/void — US4 complete

---

## Phase 7: User Story 5 — Customer Debt Tracking & Payments (Priority: P3)

**Goal**: Track customer debts from credit/partial sales, record payments with FIFO allocation across oldest invoices, view profile with debt and payment history, manual balance adjustments

**Independent Test**: Create credit sale for customer, verify debt on profile, make single payment covering parts of two invoices, verify balances update correctly

- [x] T094 [P] [US5] Create CustomerPayment model with schema (customerId ref, amount, allocations[] embedded PaymentAllocation with invoiceId/amount, receivedBy ref, createdAt) in src/lib/models/CustomerPayment.ts
- [x] T095 [P] [US5] Create BalanceAdjustment model with schema (entityType enum customer/supplier, entityId, amount integer positive=increase/negative=decrease, reason required, adjustedBy ref, createdAt) in src/lib/models/BalanceAdjustment.ts
- [x] T096 [US5] Update models barrel export to include CustomerPayment, BalanceAdjustment in src/lib/models/index.ts
- [x] T097 [US5] Create customer service (recordPayment: FIFO allocation across oldest unpaid invoices, create CustomerPayment with allocations, update invoice remainingBalance, update customer.totalOwed; adjustBalance: create BalanceAdjustment, update customer.totalOwed; getCustomerProfile: aggregate unpaid invoices + payments + adjustments) in src/lib/services/customer.service.ts
- [x] T098 [P] [US5] Create GET (list with search, hasDebt filter, pagination) and POST (create with validation) handlers for /api/customers in src/app/api/customers/route.ts
- [x] T099 [US5] Create GET (profile with debts, payments, adjustments) and PUT (update) handlers for /api/customers/:id in src/app/api/customers/[id]/route.ts
- [x] T100 [US5] Create POST /api/customers/:id/payments route handler (withPermission customers.payments, call customer.service.recordPayment) in src/app/api/customers/[id]/payments/route.ts
- [x] T101 [US5] Create POST /api/customers/:id/adjustments route handler (withPermission balance.adjust, call customer.service.adjustBalance) in src/app/api/customers/[id]/adjustments/route.ts
- [x] T102 [P] [US5] Create CustomerForm component (Ant Design Form: name required, phone optional) in src/components/customers/CustomerForm.tsx
- [x] T103 [P] [US5] Create CustomerProfile component (totalOwed with MoneyDisplay, unpaid invoices table, payment history table, adjustment history) in src/components/customers/CustomerProfile.tsx
- [x] T104 [P] [US5] Create PaymentDialog component (Ant Design Modal: amount input, allocation preview showing which invoices will be settled, confirm button) in src/components/customers/PaymentDialog.tsx
- [x] T105 [US5] Create customer list page as Server Component with search and debt filter in src/app/(dashboard)/customers/page.tsx
- [x] T106 [US5] Create customer detail page with CustomerProfile, PaymentDialog, and adjustment controls in src/app/(dashboard)/customers/[id]/page.tsx

**Checkpoint**: Customer debt tracking with FIFO payment allocation works end-to-end — US5 complete

---

## Phase 8: User Story 6 — Warehouse & Pharmacy-Floor Stock Transfers (Priority: P3)

**Goal**: Transfer stock between warehouse and pharmacy floor with mandatory reason, view transfer history

**Independent Test**: Receive stock into warehouse via supplier invoice, transfer to floor, verify balances update, confirm only floor stock available for POS sale

- [x] T107 [P] [US6] Create StockTransfer model with schema (productId ref, batchId ref, quantity, direction enum to_floor/to_warehouse, reason required, transferredBy ref, createdAt) with indexes on productId+createdAt in src/lib/models/StockTransfer.ts
- [x] T108 [US6] Update models barrel export to include StockTransfer in src/lib/models/index.ts
- [x] T109 [US6] Add transfer methods to stock service (transferToFloor: validate warehouseQty >= quantity, decrement warehouseQty, increment floorQty, create StockTransfer, log audit; transferToWarehouse: reverse direction) in src/lib/services/stock.service.ts
- [x] T110 [US6] Create GET (list with productId, direction, date filters, pagination) and POST (withPermission stock.transfer, validate and execute transfer) handlers for /api/stock/transfers in src/app/api/stock/transfers/route.ts
- [x] T111 [US6] Create TransferForm component (product selector, batch selector showing current warehouse/floor qty, quantity input, direction toggle, reason input) in src/components/stock/TransferForm.tsx
- [x] T112 [US6] Update stock overview page to include TransferForm and transfer history table in src/app/(dashboard)/stock/page.tsx

**Checkpoint**: Stock transfers between warehouse and floor work with reason tracking — US6 complete

---

## Phase 9: User Story 7 — Refunds & Sale Cancellations (Priority: P3)

**Goal**: Cancel completed sales (full reversal), create refunds with or without original invoice reference, auto-restore stock to floor, adjust customer balance

**Independent Test**: Create sale, cancel it, verify stock fully restored and invoice marked cancelled. Create another sale, issue partial refund, verify stock and customer balance updated

- [x] T113 [US7] Create Refund model with schema (refundNumber unique auto-generated, originalInvoiceId ref nullable, items[] embedded RefundItem with productId/quantity/unitPrice/subtotal, total, customerId ref nullable, processedBy ref, createdAt) in src/lib/models/Refund.ts
- [x] T114 [US7] Update models barrel export to include Refund in src/lib/models/index.ts
- [x] T115 [US7] Create refund service (createRefund: validate items, return stock to floor batches, create Refund record, adjust customer.totalOwed if applicable, log audit; cancelSale: mark invoice cancelled, reverse all batch allocations by restoring floorQty, reverse customer balance if credit sale, log audit) in src/lib/services/refund.service.ts
- [x] T116 [P] [US7] Create POST /api/pos/cancel/:invoiceId route handler (withPermission pos.cancel, call refund.service.cancelSale) in src/app/api/pos/cancel/[invoiceId]/route.ts
- [x] T117 [US7] Create GET (list with filters: originalInvoiceId, customerId, date range, pagination) and POST (withPermission refunds.create, call refund.service.createRefund) handlers for /api/refunds in src/app/api/refunds/route.ts
- [x] T118 [US7] Add sale cancellation button and refund creation UI (refund dialog with optional invoice lookup, item selection, quantity input) to POS screen in src/components/pos/POSScreen.tsx

**Checkpoint**: Refunds and cancellations correctly reverse stock and financial records — US7 complete

---

## Phase 10: User Story 8 — Reports & Analytics (Priority: P4)

**Goal**: Owner views detailed reports (sales, profit with batch-level COGS, stock, customer debt, supplier debt) with date filters, period comparisons, and Excel export

**Independent Test**: Generate sales over multiple days, view sales report with date filter, verify profit calculation uses actual batch costs, compare month-over-month, export each report to Excel

- [ ] T119 [US8] Expand report service with full report methods (salesReport: aggregate by date with totals/counts; profitReport: join saleInvoice.batchAllocations to compute actual COGS per sale; stockReport: aggregate batch quantities by product; customerDebtReport: aggregate customer balances; supplierDebtReport: aggregate supplier balances; all with date range filters and comparison period support) in src/lib/services/report.service.ts
- [ ] T120 [US8] Create Excel export service (generateSalesExcel, generateProfitExcel, generateStockExcel, generateCustomerDebtExcel, generateSupplierDebtExcel) using ExcelJS with RTL worksheet direction, Arabic headers, formatted monetary columns in src/lib/services/excel.service.ts
- [ ] T121 [P] [US8] Create GET /api/reports/sales route handler (withPermission reports.view, date filters, comparison) in src/app/api/reports/sales/route.ts
- [ ] T122 [P] [US8] Create GET /api/reports/profit route handler in src/app/api/reports/profit/route.ts
- [ ] T123 [P] [US8] Create GET /api/reports/stock route handler in src/app/api/reports/stock/route.ts
- [ ] T124 [P] [US8] Create GET /api/reports/customer-debt route handler in src/app/api/reports/customer-debt/route.ts
- [ ] T125 [P] [US8] Create GET /api/reports/supplier-debt route handler in src/app/api/reports/supplier-debt/route.ts
- [ ] T126 [US8] Create GET /api/reports/export/:type route handler (generate Excel via excel.service, return as application/vnd.openxmlformats-officedocument.spreadsheetml.sheet download) in src/app/api/reports/export/[type]/route.ts
- [ ] T127 [P] [US8] Create ReportFilters component (date range picker, period shortcuts today/yesterday/this_week/this_month/custom, comparison toggle mom/yoy) as Client Component in src/components/reports/ReportFilters.tsx
- [ ] T128 [P] [US8] Create ReportTable component (Ant Design Table with configurable columns, MoneyDisplay for monetary columns, export to Excel button) in src/components/reports/ReportTable.tsx
- [ ] T129 [US8] Create reports page with tabbed views (sales, profit, stock, customer debt, supplier debt), ReportFilters, ReportTable, and export controls in src/app/(dashboard)/reports/page.tsx

**Checkpoint**: All reports with date filters, comparisons, and Excel export — US8 complete

---

## Phase 11: User Story 9 — Inventory Audit & Stock Counting (Priority: P4)

**Goal**: Owner starts audit session, records physical counts per product/location, reviews discrepancies, approves adjustments to reconcile system stock

**Independent Test**: Start audit, enter counts for products (some matching, some not), review discrepancies, approve adjustments, verify system stock updated

- [ ] T130 [US9] Create InventoryAuditSession model with schema (status enum in_progress/completed, counts[] embedded AuditCount with productId/location/expectedQty/actualQty/discrepancy/adjusted, startedBy ref, startedAt, completedAt) in src/lib/models/InventoryAuditSession.ts
- [ ] T131 [US9] Update models barrel export to include InventoryAuditSession in src/lib/models/index.ts
- [ ] T132 [US9] Create POST /api/inventory-audits route handler (withPermission inventory-audits.manage, create session with current stock snapshots as expectedQty) in src/app/api/inventory-audits/route.ts
- [ ] T133 [US9] Create GET /api/inventory-audits/:id route handler, PUT /api/inventory-audits/:id/counts route handler (update physical counts), and POST /api/inventory-audits/:id/approve route handler (apply adjustments to batches, mark session completed, log audit) in src/app/api/inventory-audits/[id]/route.ts, src/app/api/inventory-audits/[id]/counts/route.ts, and src/app/api/inventory-audits/[id]/approve/route.ts
- [ ] T134 [US9] Create AuditSession component (product list with current system qty, count input fields, discrepancy highlighting with color coding, approve adjustments button) in src/components/stock/AuditSession.tsx
- [ ] T135 [US9] Create inventory audit page with session list, start new session button, and active session view in src/app/(dashboard)/stock/audit/page.tsx

**Checkpoint**: Inventory audit with count entry, discrepancy review, and adjustment approval — US9 complete

---

## Phase 12: User Story 10 — Audit Logging & Traceability (Priority: P4)

**Goal**: View and search immutable audit logs by user, date range, product, invoice number, and action type

**Independent Test**: Perform auditable actions (sale, refund, stock adjustment), open audit log viewer, search by each filter type, verify entries are present and immutable

- [ ] T136 [US10] Create GET /api/audit-logs route handler (withPermission audit-logs.view, search filters: userId, action, entityType, invoiceNumber, productId, from/to date range, pagination) in src/app/api/audit-logs/route.ts
- [ ] T137 [US10] Create audit log viewer page with Ant Design filter form (user dropdown, action type dropdown, date range picker, invoice number input, product search) and paginated results table showing timestamp, user, action, entity, details in src/app/(dashboard)/audit-logs/page.tsx
- [ ] T138 [US10] Verify all service mutations call audit.service.logAction — audit each service file (pos.service, stock.service, supplier.service, customer.service, refund.service) and add any missing audit log calls for: sale.created, sale.cancelled, refund.created, stock.adjusted, stock.transferred, supplier-invoice.created, supplier-invoice.edited, supplier-invoice.voided, supplier-payment.recorded, customer-payment.recorded, balance.adjusted

**Checkpoint**: Audit logs viewable, searchable, and verified complete across all services — US10 complete

---

## Phase 13: User Story 11 — User Management & Permissions (Priority: P4)

**Goal**: Owner creates/edits user accounts, assigns roles (owner/cashier), configures granular permissions per user, deactivates accounts

**Independent Test**: Create cashier account with default permissions, log in as cashier and verify POS-only access, grant products.manage permission, verify catalog access, deactivate account, verify login fails

- [ ] T139 [US11] Create GET (list with role filter, isActive filter, pagination) and POST (withPermission users.manage, create user with role + permissions, hash password) handlers for /api/users in src/app/api/users/route.ts
- [ ] T140 [US11] Create PUT /api/users/:id route handler (withPermission users.manage, update name, email, role, permissions, isActive; optionally reset password) in src/app/api/users/[id]/route.ts
- [ ] T141 [US11] Create user management page with user list table (name, email, role, status), create user modal (Ant Design Form with all fields), edit user drawer with permission checkboxes (all 22 permission keys from permissions.md grouped by category), and deactivate toggle in src/app/(dashboard)/users/page.tsx

**Checkpoint**: Full user lifecycle management with granular permissions — US11 complete

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: System settings, backup/restore, edge case handling, and final quality validation

- [ ] T142 [P] Create GET (withPermission settings.view) and PUT (withPermission settings.manage, validate settingsSchema) handlers for /api/settings in src/app/api/settings/route.ts
- [ ] T143 [P] Create backup service (exportAllData: stream all collections as JSON download; importFromJSON: validate structure, drop and reimport with transaction safety) in src/lib/services/backup.service.ts
- [ ] T144 Create POST /api/backup/export (withPermission backup.manage, call backup.service.exportAllData) and POST /api/backup/import (withPermission backup.manage, call backup.service.importFromJSON) route handlers in src/app/api/backup/export/route.ts and src/app/api/backup/import/route.ts
- [ ] T145 Create settings page with Ant Design Form (expiringSoonDays number input, defaultLowStockThreshold number input, maxDiscountPercentage input as percentage, save button) and backup section (export button, import with file upload) in src/app/(dashboard)/settings/page.tsx
- [ ] T146 Verify RTL layout consistency across all pages — check logical properties, Ant Design component alignment, Arabic text rendering, and fix any LTR leaks
- [ ] T147 Handle edge cases: concurrent stock depletion (optimistic locking on batch qty), discount exceeding price (cap at item price), voiding invoice after stock sold (return 409 with message), customer overpayment (cap at totalOwed), zero-stock during checkout (return clear error)
- [ ] T148 Run quickstart.md validation — verify npm install, dev server startup, seed owner creation, login flow, and all env vars are correctly documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)** + **US2 (Phase 4)**: Both P1, start after Phase 2, run in parallel
- **US3 (Phase 5)** + **US4 (Phase 6)**: Both P2, start after Phase 2, run in parallel
- **US5 (Phase 7)**: P3, start after Phase 2 (integrates with US2 credit sales)
- **US6 (Phase 8)**: P3, start after Phase 2 (integrates with US4 warehouse stock)
- **US7 (Phase 9)**: P3, **depends on US2** (needs sales to cancel/refund)
- **US8 (Phase 10)**: P4, best after US2+US4+US5 (needs data to report on)
- **US9 (Phase 11)**: P4, start after Phase 2 (independent)
- **US10 (Phase 12)**: P4, start after Phase 2 (independent — audit service already foundational)
- **US11 (Phase 13)**: P4, start after Phase 2 (independent)
- **Polish (Phase 14)**: After all user stories complete

### User Story Independence

| Story | Hard Dependencies | Soft Dependencies (for integration) |
|-------|-------------------|--------------------------------------|
| US1 | Phase 2 only | None |
| US2 | Phase 2 only | US5 for credit sale customer flow |
| US3 | Phase 2 only | None |
| US4 | Phase 2 only | None |
| US5 | Phase 2 only | US2 creates debts to track |
| US6 | Phase 2 only | US4 populates warehouse stock |
| US7 | Phase 2 + **US2** | US5 for customer balance reversal |
| US8 | Phase 2 only | US2+US4+US5 for meaningful data |
| US9 | Phase 2 only | None |
| US10 | Phase 2 only | All services for complete audit coverage |
| US11 | Phase 2 only | None |

### Within Each User Story

1. Models → barrel export update
2. Services (depend on models)
3. API route handlers (depend on services) — handlers for different routes can be parallel [P]
4. UI components (can parallel with API routes if shapes are known) — independent components can be parallel [P]
5. Pages (depend on components they compose)

### Parallel Opportunities

**After Phase 2, these groups can run simultaneously:**
- Group A: US1 + US2 (both P1)
- Group B: US3 + US4 (both P2, after or alongside Group A)
- Group C: US5 + US6 + US9 + US10 + US11 (all independent)
- Group D: US7 (after US2 complete)
- Group E: US8 (after US2+US4+US5 for full value)

---

## Parallel Examples

### Foundational Phase — Model Creation

```bash
# All models are independent files — launch in parallel:
Task: "Create Product model in src/lib/models/Product.ts"
Task: "Create Batch model in src/lib/models/Batch.ts"
Task: "Create Customer model in src/lib/models/Customer.ts"
Task: "Create Settings model in src/lib/models/Settings.ts"
Task: "Create AuditLog model in src/lib/models/AuditLog.ts"
```

### User Story 2 (POS) — API Routes + Components

```bash
# After POS service is created, launch parallel API routes:
Task: "Create POST /api/pos/search route handler in src/app/api/pos/search/route.ts"
Task: "Create POST /api/pos/checkout route handler in src/app/api/pos/checkout/route.ts"

# Launch parallel UI components:
Task: "Create BarcodeScanner component in src/components/pos/BarcodeScanner.tsx"
# (ProductSearch depends on BarcodeScanner, so it follows)
```

### User Story 4 (Suppliers) — Model Creation

```bash
# All supplier models are independent — launch in parallel:
Task: "Create Supplier model in src/lib/models/Supplier.ts"
Task: "Create SupplierInvoice model in src/lib/models/SupplierInvoice.ts"
Task: "Create SupplierPayment model in src/lib/models/SupplierPayment.ts"
Task: "Create SupplierReturn model in src/lib/models/SupplierReturn.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: US1 (Dashboard) — parallel with Phase 4
4. Complete Phase 4: US2 (POS Sales)
5. **STOP and VALIDATE**: Login flows, dashboard summary, full POS checkout, FEFO depletion, cash and credit sales
6. Deploy MVP to Render

### Incremental Delivery

1. **Setup + Foundational** → Framework ready
2. **US1 + US2** → Core operations (MVP!) → Deploy
3. **US3 + US4** → Product catalog + supplier purchasing → Deploy
4. **US5 + US6 + US7** → Customer debt + transfers + refunds → Deploy
5. **US8 + US9 + US10 + US11** → Reports, audit, user management → Deploy
6. **Polish** → Settings, backup, edge cases, RTL audit → Final deploy

### Single Developer Strategy

Follow strict priority order: Setup → Foundational → US1 → US2 → US3 → US4 → US5 → US6 → US7 → US8 → US9 → US10 → US11 → Polish

Commit after each completed task or logical group. Validate at each checkpoint.

---

## Notes

- Total tasks: **148** (T001–T148)
- [P] tasks can run in parallel (different files, no dependencies on incomplete tasks)
- [Story] labels map tasks to user stories for traceability
- Each user story is independently testable after Phase 2
- No test tasks included — testing was not explicitly requested
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
