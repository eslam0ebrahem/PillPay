# Implementation Plan: Pharmacy POS & Management System

**Branch**: `001-pharmacy-pos-system` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-pharmacy-pos-system/spec.md`

## Summary

Build a cloud-hosted Arabic-only pharmacy management web application with POS, stock management (warehouse + floor with FEFO depletion), supplier purchasing, customer debt tracking, and analytics. The system serves two roles: owner (dashboard + full management) and cashier (POS-first workflow). Built as a single Next.js 16 full-stack application with React 19, using Server Components for data-heavy pages and Client Components for interactive POS. MongoDB Atlas for storage, Mongoose for ODM. Profit is calculated using batch-level COGS with perpetual inventory. Hosted on Render as a single Web Service.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS, React 19
**Primary Dependencies**: Next.js 16, Mongoose 8.x, Ant Design 5.x, TanStack React Query 5.x, html5-qrcode 2.x, ExcelJS 4.x, Zod (validation)
**Storage**: MongoDB Atlas (Mongoose ODM)
**Testing**: Vitest (unit + integration), React Testing Library (components)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge), deployed on Render
**Project Type**: Full-stack web application (Next.js 16 App Router)
**Performance Goals**: POS search <1s for 10k products, report generation <5s for 1 year data, checkout <60s end-to-end
**Constraints**: Arabic-only RTL interface, no offline mode, no receipt printing, up to 5 concurrent users
**Scale/Scope**: Single pharmacy, ~10k products, ~11 pages, ~30 API route handlers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file contains placeholder template only — no project-specific principles defined. No gates to enforce.

**Post-Phase 1 re-check**: No violations. Single Next.js project — simplest possible full-stack structure.

## Project Structure

### Documentation (this feature)

```text
specs/001-pharmacy-pos-system/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions and rationale
├── data-model.md        # Phase 1: MongoDB collections, schemas, indexes
├── quickstart.md        # Phase 1: Setup guide, project structure, env vars
├── contracts/
│   ├── api.md           # Phase 1: REST API route handlers and contracts
│   └── permissions.md   # Phase 1: Role-based permission model
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js 16 App Router
│   ├── layout.tsx                # Root layout (RTL, Arabic, Ant Design providers)
│   ├── page.tsx                  # Root redirect (→ login / dashboard / pos)
│   ├── globals.css               # Global styles + RTL overrides
│   ├── (auth)/
│   │   └── login/page.tsx        # Login page (Client Component)
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Authenticated layout with sidebar
│   │   ├── page.tsx              # Owner dashboard (Server Component)
│   │   ├── products/
│   │   │   ├── page.tsx          # Product list
│   │   │   └── [id]/page.tsx     # Product detail + batches
│   │   ├── customers/
│   │   │   ├── page.tsx          # Customer list
│   │   │   └── [id]/page.tsx     # Customer profile + debts
│   │   ├── suppliers/
│   │   │   ├── page.tsx          # Supplier list
│   │   │   └── [id]/page.tsx     # Supplier profile
│   │   ├── supplier-invoices/
│   │   │   ├── page.tsx          # Invoice list
│   │   │   └── new/page.tsx      # Create supplier invoice
│   │   ├── stock/
│   │   │   ├── page.tsx          # Stock overview + transfers
│   │   │   └── audit/page.tsx    # Inventory audit sessions
│   │   ├── reports/page.tsx      # Reports with filters + export
│   │   ├── audit-logs/page.tsx   # Audit log viewer
│   │   ├── users/page.tsx        # User management
│   │   └── settings/page.tsx     # System settings + backup
│   ├── pos/
│   │   ├── layout.tsx            # POS-specific layout (minimal chrome)
│   │   └── page.tsx              # POS screen (Client Component)
│   └── api/                      # API Route Handlers
│       ├── auth/{login,refresh,me,logout}/route.ts
│       ├── users/route.ts & [id]/route.ts
│       ├── products/route.ts & [id]/route.ts & alerts/route.ts
│       ├── pos/{search,checkout}/route.ts & cancel/[invoiceId]/route.ts
│       ├── customers/route.ts & [id]/{route,payments,adjustments}/route.ts
│       ├── suppliers/route.ts & [id]/{route,adjustments}/route.ts
│       ├── supplier-invoices/route.ts & [id]/{route,void,payments}/route.ts
│       ├── supplier-returns/route.ts
│       ├── stock/{transfers,adjustments}/route.ts
│       ├── refunds/route.ts
│       ├── inventory-audits/route.ts & [id]/{route,counts,approve}/route.ts
│       ├── reports/{dashboard,sales,profit,stock,customer-debt,supplier-debt}/route.ts
│       ├── reports/export/[type]/route.ts
│       ├── audit-logs/route.ts
│       ├── settings/route.ts
│       └── backup/{export,import}/route.ts
├── lib/                          # Shared server-side code
│   ├── db/connection.ts          # Mongoose connection singleton
│   ├── models/                   # Mongoose schemas (15 models)
│   │   ├── User.ts, Product.ts, Batch.ts, SaleInvoice.ts
│   │   ├── Customer.ts, CustomerPayment.ts, BalanceAdjustment.ts
│   │   ├── Supplier.ts, SupplierInvoice.ts, SupplierPayment.ts, SupplierReturn.ts
│   │   ├── StockTransfer.ts, Refund.ts, AuditLog.ts
│   │   ├── InventoryAuditSession.ts, Settings.ts
│   │   └── index.ts
│   ├── services/                 # Business logic (11 services)
│   │   ├── auth.service.ts       # Login, token generation
│   │   ├── pos.service.ts        # Checkout, FEFO, cart logic
│   │   ├── stock.service.ts      # FEFO depletion, transfers, adjustments
│   │   ├── customer.service.ts   # Debt tracking, payment allocation
│   │   ├── supplier.service.ts   # Invoice processing, stock creation
│   │   ├── refund.service.ts     # Refund processing, stock return
│   │   ├── report.service.ts     # Aggregation queries, profit calc
│   │   ├── excel.service.ts      # Excel file generation
│   │   ├── audit.service.ts      # Immutable audit log creation
│   │   ├── backup.service.ts     # JSON export/import
│   │   └── alerts.service.ts     # Stock/expiration alert queries
│   ├── auth/
│   │   ├── jwt.ts                # JWT sign/verify helpers
│   │   ├── middleware.ts         # Auth + permission check for API routes
│   │   └── session.ts            # Get current user from cookie
│   ├── utils/
│   │   ├── money.ts              # Piaster helpers
│   │   ├── invoiceNumber.ts      # Sequential number generation
│   │   └── validation.ts         # Zod schemas
│   └── types/index.ts            # Shared TypeScript types
├── components/                   # React components
│   ├── layout/                   # AppShell, Sidebar, Header
│   ├── pos/                      # POSScreen, ProductSearch, BarcodeScanner, Cart, Checkout
│   ├── products/                 # ProductForm, ProductList, BatchViewer
│   ├── customers/                # CustomerForm, CustomerProfile, PaymentDialog
│   ├── suppliers/                # SupplierForm, InvoiceForm, SupplierProfile
│   ├── stock/                    # TransferForm, AdjustmentForm, AuditSession
│   ├── reports/                  # DashboardCards, ReportFilters, ReportTable
│   └── common/                   # ArabicInput, MoneyDisplay, PermissionGuard
├── hooks/                        # useAuth, usePermissions, useBarcodeScan
├── i18n/ar.ts                    # All Arabic UI strings
├── utils/                        # Client-side money.ts, units.ts
└── middleware.ts                  # Next.js middleware (auth redirect, role routing)

tests/
├── unit/                         # Service unit tests
├── integration/                  # API route handler tests
└── fixtures/                     # Test data
```

**Structure Decision**: Single Next.js 16 project with App Router. API Route Handlers replace Express, Server Components render data-heavy pages, Client Components handle interactive POS. Single `package.json`, single Render deployment.

## Complexity Tracking

No constitution violations. Architecture is intentionally simple:
- Single Next.js project — no separate backend/frontend services
- No microservices — API Route Handlers in the same process
- No external message queues — audit logging is synchronous in service layer
- No caching layer — MongoDB queries are sufficient at this scale
- No WebSockets — all interactions are request/response
