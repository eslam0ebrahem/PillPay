# Research: Pharmacy POS & Management System

**Branch**: `001-pharmacy-pos-system` | **Date**: 2026-03-09

## Technology Decisions

### Full-Stack Framework

- **Decision**: Next.js 16 with React 19 (App Router)
- **Rationale**: User-specified. Next.js 16 provides a unified full-stack framework — Server Components for data-heavy pages (dashboard, reports, product lists), Client Components for interactive UI (POS, cart, barcode scanner), and API Route Handlers for the REST API. Single deployment on Render. React 19 brings improved Server Components, Actions, and the `use()` hook for cleaner async patterns.
- **Alternatives considered**:
  - Express + Vite SPA: More moving parts, two deployments, no Server Components
  - Remix: Good full-stack option but Next.js has larger ecosystem and better Render support

### Server vs Client Component Strategy

- **Decision**: Server Components by default; Client Components only for interactive elements
- **Rationale**: Server Components reduce client bundle size and allow direct database access via services. POS page is fully Client Component (heavy interactivity). Dashboard, reports, product lists, supplier pages use Server Components for initial render with Client Component islands for interactive elements (filters, forms, modals).
- **Key split**:
  - **Server Components**: Dashboard, product list, customer list, supplier list, reports, audit logs, settings
  - **Client Components**: POS screen, barcode scanner, cart, all forms/modals, checkout dialog, report filters

### Database & ODM

- **Decision**: MongoDB Atlas with Mongoose ODM
- **Rationale**: Specified by the user. MongoDB's flexible schema suits the varied product data fields. Mongoose provides schema validation, middleware hooks (useful for audit logging), and population for references. Atlas provides managed backups and monitoring.
- **Alternatives considered**: None — MongoDB Atlas is a hard requirement.
- **Connection pattern**: Singleton connection cached in `globalThis` to survive Next.js hot reloads in development.

### Authentication

- **Decision**: JWT stored in HTTP-only cookies + Next.js middleware for route protection
- **Rationale**: HTTP-only cookies are more secure than localStorage JWT (immune to XSS). Next.js middleware intercepts requests at the edge for fast auth checks and role-based redirects (owner → dashboard, cashier → POS). Server Components and API routes extract the user from the cookie. No need for Auth.js/NextAuth since only email/password auth is required — a lightweight custom implementation keeps dependencies minimal.
- **Alternatives considered**:
  - Auth.js (NextAuth) v5: Adds abstraction for a single auth method; credential provider has limitations
  - iron-session: Good option but custom JWT gives more control over token payload (role, permissions)

### Arabic Text Search

- **Decision**: MongoDB text index with Arabic language support + regex fallback for partial matching
- **Rationale**: MongoDB natively supports Arabic text indexing with stemming. For fuzzy/partial matching, a combination of regex on nameAr/nameEn fields and text index provides sub-second search on catalogs up to 10,000 products. No external search service needed at this scale.
- **Alternatives considered**:
  - MongoDB Atlas Search (Lucene): More powerful but adds cost; overkill for 10k products
  - Elasticsearch: External dependency; unnecessary complexity for this scale

### Barcode Scanning

- **Decision**: html5-qrcode library for browser-based camera barcode scanning
- **Rationale**: Lightweight, well-maintained library that supports Code-128, EAN-13, and other common pharmacy barcode formats. Works on mobile and desktop browsers. Used as Client Component in the POS page.
- **Alternatives considered**:
  - QuaggaJS: Less actively maintained
  - ZXing-js: Larger bundle size

### Excel Export

- **Decision**: ExcelJS (server-side generation in API Route Handlers)
- **Rationale**: Server-side generation allows streaming large reports without blocking the browser. ExcelJS supports Arabic text, RTL worksheets, and styled formatting. Generated files are downloaded via API route handler.
- **Alternatives considered**:
  - SheetJS (xlsx): Less styling control
  - Client-side generation: May fail on large datasets

### Monetary Precision

- **Decision**: Store all monetary values as integers (piasters / قرش) — multiply by 100 on storage, divide by 100 on display
- **Rationale**: Avoids floating-point precision issues entirely. All calculations use integer arithmetic. EGP has exactly 2 decimal places (100 piasters = 1 EGP), making integer storage straightforward.
- **Alternatives considered**:
  - MongoDB Decimal128: More complex to work with in application code; integer piasters are simpler

### UI Component Library

- **Decision**: Ant Design (antd) with RTL configuration
- **Rationale**: Ant Design has built-in RTL support via ConfigProvider, comprehensive Arabic-ready components (tables, forms, modals, date pickers), and a professional business UI aesthetic suitable for POS and admin dashboards. Works well with Next.js App Router — wrap in a Client Component provider at the layout level.
- **Alternatives considered**:
  - Material UI (MUI): Good RTL support but heavier
  - Chakra UI: Less mature RTL support
  - shadcn/ui: Excellent but requires more manual RTL work; Ant Design has it built-in

### State Management

- **Decision**: TanStack React Query for client-side server state + React Context for auth/UI state
- **Rationale**: Server Components handle most data fetching. For Client Components (POS, forms), TanStack React Query manages cache, refetching, and optimistic updates. No Redux or Zustand needed — the app is server-state heavy with minimal client-only state.
- **Alternatives considered**:
  - Server Components only (no client cache): Not viable for POS page which needs real-time cart state and fast product search
  - SWR: TanStack Query has richer mutation and cache invalidation support

### Deployment

- **Decision**: Render with a single Web Service
- **Rationale**: Render is specified by the user. Next.js 16 runs as a single Node.js server handling both SSR/API and static assets. One deployment, one service, one URL. Simpler than the previous two-service approach.
- **Alternatives considered**: None — Render is a hard requirement.

### Backup & Restore

- **Decision**: Application-level JSON export/import via API Route Handlers
- **Rationale**: MongoDB Atlas provides infrastructure-level backups automatically. The application-level backup feature (FR-054) exports business data as a downloadable JSON archive via an API route handler. This gives the owner a portable backup without requiring direct database access.
- **Alternatives considered**:
  - mongodump/mongorestore: Requires shell access; not user-friendly for pharmacy owners

## Architecture Decisions

### Single Project Structure

- **Decision**: Single Next.js project with `src/` directory
- **Rationale**: Next.js 16 eliminates the need for separate backend/frontend projects. API Route Handlers serve the REST API, Server Components render pages, services contain business logic. Shared TypeScript types across the entire codebase. Single `package.json`, single deployment.

### API Architecture

- **Decision**: RESTful API via Next.js Route Handlers with JSON payloads
- **Rationale**: Simple, well-understood pattern. Next.js Route Handlers support all HTTP methods, streaming, and middleware. No real-time requirements. Server Components can bypass the API and call services directly for initial page renders, reducing network round-trips.

### Server Component Data Access Pattern

- **Decision**: Server Components call services directly; Client Components use API Route Handlers via TanStack Query
- **Rationale**: Server Components run on the server and can import services directly — no HTTP overhead for initial page loads (dashboard, product lists, reports). Client Components (POS, forms) use the REST API via fetch/TanStack Query for mutations and dynamic data. This hybrid approach maximizes performance.

### Audit Log Implementation

- **Decision**: Separate MongoDB collection with no update/delete operations exposed at the application level
- **Rationale**: Immutability is enforced at the application layer — the Mongoose model and API layer only expose `create` and `find` operations. MongoDB Atlas access controls further restrict direct collection modification.

### FEFO Implementation

- **Decision**: Query-time FEFO selection (sort batches by expirationDate ascending, consume sequentially)
- **Rationale**: At checkout, the service queries pharmacy-floor batches for the product, sorted by expiration date ascending, and allocates quantity from earliest-expiring first. Simple, correct implementation for this scale.

### Next.js Middleware Strategy

- **Decision**: Single `middleware.ts` at project root for auth and role-based routing
- **Rationale**: Next.js middleware runs before every request. It checks for the auth cookie, redirects unauthenticated users to login, redirects owners to dashboard and cashiers to POS after login, and blocks unauthorized access to management routes for cashiers.
