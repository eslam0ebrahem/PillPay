# Quickstart: Pharmacy POS & Management System

**Branch**: `001-pharmacy-pos-system` | **Date**: 2026-03-09

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.x |
| UI library | React | 19.x |
| Language | TypeScript | 5.x |
| Runtime | Node.js | 20 LTS |
| Database | MongoDB Atlas | 7.x |
| ODM | Mongoose | 8.x |
| Authentication | JWT (HTTP-only cookies) + bcrypt | |
| Component library | Ant Design | 5.x (RTL) |
| Server state | TanStack React Query | 5.x |
| Barcode scanning | html5-qrcode | 2.x |
| Excel export | ExcelJS | 4.x |
| Validation | Zod | 3.x |
| Testing | Vitest + React Testing Library | |
| Hosting | Render (single Web Service) | |
| Database hosting | MongoDB Atlas | Free/Shared tier initially |

## Project Structure

```
PillPay/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (RTL, Ant Design ConfigProvider)
│   │   ├── page.tsx                  # Root redirect → login/dashboard/pos
│   │   ├── globals.css               # Global styles + RTL
│   │   ├── (auth)/
│   │   │   └── login/page.tsx        # Login page (Client Component)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Authenticated shell with sidebar
│   │   │   ├── page.tsx              # Owner dashboard (Server Component)
│   │   │   ├── products/
│   │   │   │   ├── page.tsx          # Product list
│   │   │   │   └── [id]/page.tsx     # Product detail + batches
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx     # Customer profile + debts
│   │   │   ├── suppliers/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx     # Supplier profile
│   │   │   ├── supplier-invoices/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/page.tsx      # Create supplier invoice
│   │   │   ├── stock/
│   │   │   │   ├── page.tsx          # Stock overview + transfers
│   │   │   │   └── audit/page.tsx    # Inventory audit
│   │   │   ├── reports/page.tsx
│   │   │   ├── audit-logs/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── settings/page.tsx     # Settings + backup
│   │   ├── pos/
│   │   │   ├── layout.tsx            # POS minimal layout
│   │   │   └── page.tsx              # POS screen (Client Component)
│   │   └── api/                      # API Route Handlers (~30 endpoints)
│   │       ├── auth/...
│   │       ├── users/...
│   │       ├── products/...
│   │       ├── pos/...
│   │       ├── customers/...
│   │       ├── suppliers/...
│   │       ├── supplier-invoices/...
│   │       ├── stock/...
│   │       ├── refunds/...
│   │       ├── inventory-audits/...
│   │       ├── reports/...
│   │       ├── audit-logs/...
│   │       ├── settings/...
│   │       └── backup/...
│   ├── lib/                          # Server-side shared code
│   │   ├── db/connection.ts          # Mongoose singleton connection
│   │   ├── models/                   # 15 Mongoose models
│   │   ├── services/                 # 11 business logic services
│   │   ├── auth/                     # JWT, middleware, session helpers
│   │   ├── utils/                    # money.ts, invoiceNumber.ts, validation.ts
│   │   └── types/index.ts
│   ├── components/                   # React components
│   │   ├── layout/                   # AppShell, Sidebar, Header
│   │   ├── pos/                      # POSScreen, ProductSearch, BarcodeScanner, Cart
│   │   ├── products/                 # ProductForm, ProductList, BatchViewer
│   │   ├── customers/                # CustomerForm, CustomerProfile, PaymentDialog
│   │   ├── suppliers/                # SupplierForm, InvoiceForm
│   │   ├── stock/                    # TransferForm, AdjustmentForm, AuditSession
│   │   ├── reports/                  # DashboardCards, ReportFilters, ReportTable
│   │   └── common/                   # ArabicInput, MoneyDisplay, PermissionGuard
│   ├── hooks/                        # useAuth, usePermissions, useBarcodeScan
│   ├── i18n/ar.ts                    # All Arabic UI strings
│   ├── utils/                        # Client-side money.ts, units.ts
│   └── middleware.ts                  # Auth redirect + role routing
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── public/
├── next.config.ts
├── package.json
├── tsconfig.json
├── .env.local.example
└── specs/                            # Specification artifacts
```

## Environment Variables (.env.local)

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pillpay

# Authentication
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# Initial owner (seeded on first run)
SEED_OWNER_EMAIL=owner@pillpay.com
SEED_OWNER_PASSWORD=changeme123
SEED_OWNER_NAME=صاحب الصيدلية

# App
NEXT_PUBLIC_APP_NAME=PillPay
```

## Setup Commands

```bash
# Clone and install
git clone <repo-url> && cd PillPay
npm install
cp .env.local.example .env.local  # Edit with your MongoDB Atlas URI and secrets

# Development
npm run dev    # Starts on http://localhost:3000

# Build & Production
npm run build
npm start
```

## Key Implementation Notes

1. **Monetary values**: All prices/amounts stored as integers (piasters). Display: `(value / 100).toFixed(2) + " ج.م"`.
2. **RTL**: Ant Design `ConfigProvider` with `direction="rtl"` in root layout. CSS uses logical properties (`margin-inline-start`, not `margin-left`).
3. **Server vs Client Components**:
   - **Server Components** (default): Dashboard, product/customer/supplier lists, reports, audit logs — call services directly, no API round-trip.
   - **Client Components** (`"use client"`): POS screen, barcode scanner, cart, all forms/modals, report filters — use TanStack Query to call API Route Handlers.
4. **FEFO**: `stock.service.ts` queries batches sorted by `expirationDate: 1` with `floorQty > 0`, allocates sequentially.
5. **Auth flow**: Login → JWT stored in HTTP-only cookie → `middleware.ts` checks cookie on every request → redirects unauthenticated users to `/login`, owners to `/dashboard`, cashiers to `/pos`.
6. **Barcode scanning**: `useBarcodeScan` hook wraps html5-qrcode in POS Client Component, emits scanned code to search.
7. **Arabic search**: MongoDB text index with `{ default_language: "arabic" }` on `nameAr`, plus regex for partial `nameEn` match.
8. **Mongoose connection**: Cached in `globalThis` to survive Next.js hot reloads in dev mode.
9. **Audit logging**: Services call `audit.service.ts` after mutations; Mongoose model only exposes `create()` + `find()` — no update/delete.
10. **Excel export**: Generated server-side in API Route Handler via ExcelJS, streamed as download response.

## Render Deployment

Single Web Service on Render:

- **Build command**: `npm run build`
- **Start command**: `npm start`
- **Environment**: Node.js 20
- **Environment variables**: Set all `.env.local` values in Render dashboard
- **Health check path**: `/api/auth/me` (returns 401 for unauthenticated — confirms server is running)
