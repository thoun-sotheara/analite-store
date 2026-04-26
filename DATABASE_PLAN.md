# Analite Store — Database Architecture Plan
> Status: Planning document. No code changes yet. Execute phase by phase.

---

## System Overview

| Layer | Technology | Current Use |
|---|---|---|
| Primary DB | PostgreSQL + Drizzle ORM | Users, auth, purchases, transactions, reviews, downloads |
| Realtime DB | Firebase Firestore | Catalog management (CRUD overlay), support ticket stream |
| File Storage | AWS S3 | Template zip files (private, signed URLs) |
| Auth | NextAuth.js | Email/password + Google OAuth |
| Payments | ABA PayWay + Bakong KHQR | KH-market payment flow |

---

## Current Schema Status

### ✅ Already Exists in `lib/db/schema.ts`

| Table | Complete? | Notes |
|---|---|---|
| `users` | Partial | Missing: `avatarUrl`, `bio`, `slug` (needed for vendor profile) |
| `authCredentials` | ✅ | Solid |
| `emailVerificationTokens` | ✅ | Solid |
| `categories` | Partial | Missing: `iconSlug`, `description`, `displayOrder` |
| `templates` | Partial | Missing: `slug`, `techStack`, `screenMockupUrl`, `documentationUrl`, `downloadCount`, `updatedAt`, `isActive` |
| `purchases` | ✅ | Solid |
| `transactions` | ✅ | Solid |
| `reviews` | Partial | Missing: `authorName` (denormalized for display), `isVisible` flag |
| `downloadActivities` | ✅ | Solid |

### ❌ Missing Tables

| Table | Purpose |
|---|---|
| `vendor_profiles` | Extended vendor info: slug, bio, location, verified, socialLinks — powers vendor page |
| `wishlists` | Per-user saved template IDs — currently client-side localStorage only |
| `support_tickets` | Currently in Firestore `supportReports` — needs migration |
| `page_views` | Per-template view count for analytics and "popular" sort |
| `store_settings` | Key-value config (store name, currency, feature flags, notification prefs) |

---

## Data Flow Map — What Each Page Needs

| Page | Route | Current Source | Target Source |
|---|---|---|---|
| Homepage | `/` | `mockTemplates` via CatalogProvider | PostgreSQL via CatalogProvider |
| Products list | `/products` | `mockTemplates` | PostgreSQL |
| Product detail | `/products/[id]` | `mockTemplates` + `getReviewsByTemplateId()` | PostgreSQL `templates` + `reviews` join |
| Vendor profile | `/vendors/[slug]` | `getVendorBySlug()` mock helper | PostgreSQL `vendor_profiles` + `templates` join |
| Checkout | `/checkout/[id]` | `mockTemplates` | PostgreSQL `templates` |
| Library | `/library` | DB ✅ (`getLibraryItems`) | Already DB — no change |
| Success | `/success` | DB ✅ | Already DB — no change |
| Downloads | `/downloads` | Stub page | PostgreSQL `downloadActivities` |
| Wishlist | `/wishlist` | LocalStorage + CatalogProvider | DB `wishlists` (for signed-in users) + localStorage fallback |
| Profile | `/profile` | Session + `getLibraryItems` | Session + DB (no change needed) |
| Support | `/support` | Firestore `supportReports` | PostgreSQL `support_tickets` |
| Auth | `/auth` | DB ✅ | Already DB — no change |
| Preview | `/preview/[id]` | `mockTemplates` | PostgreSQL `templates` |
| Dashboard — all | `/dashboard` | Hardcoded `--` | PostgreSQL aggregation queries |

---

## Phase 1 — Complete the Existing Schema
> Goal: Make the existing tables production-ready by adding missing fields and creating missing tables.

### 1A — Add Missing Columns to Existing Tables

**`users` table — add:**
- `slug` varchar(80) unique nullable — for vendor URL `/vendors/[slug]`
- `avatarUrl` text nullable — profile image URL
- `bio` text nullable — vendor/profile description
- `location` varchar(120) nullable — "Phnom Penh, Cambodia"
- `isVendorVerified` boolean default false — blue BadgeCheck flag
- `updatedAt` timestamp

**`categories` table — add:**
- `description` text nullable
- `iconSlug` varchar(40) nullable — maps to lucide icon name
- `displayOrder` integer default 0 — control homepage category ordering

**`templates` table — add:**
- `slug` varchar(120) unique not null — for future SEO-friendly URLs
- `techStack` varchar(200) nullable — "Next.js, Tailwind CSS, TypeScript"
- `screenMockupUrl` text nullable — device mockup image URL
- `documentationUrl` text nullable — docs/guide URL
- `downloadCount` integer default 0 not null
- `viewCount` integer default 0 not null
- `isActive` boolean default true not null — soft delete/hide toggle
- `updatedAt` timestamp

**`reviews` table — add:**
- `authorName` varchar(120) nullable — denormalized from users.name at write time (prevents broken names if user changes name)
- `isVisible` boolean default true not null — admin moderation flag

### 1B — Create New Tables

**`vendor_profiles`** (extends `users` for VENDOR role users)
- `id` uuid PK
- `userId` uuid FK → users.id (unique — one profile per vendor user)
- `slug` varchar(80) unique not null
- `displayName` varchar(120) not null
- `bio` text nullable
- `location` varchar(120) nullable
- `avatarUrl` text nullable
- `websiteUrl` text nullable
- `isVerified` boolean default false not null
- `isActive` boolean default true not null
- `createdAt` timestamp

> Note: Keep user role in `users.role` = VENDOR. `vendor_profiles` is the extended public-facing storefront profile.

**`wishlists`**
- `id` uuid PK
- `userId` uuid FK → users.id
- `templateId` uuid FK → templates.id
- `createdAt` timestamp
- Unique constraint: (`userId`, `templateId`)

**`support_tickets`**
- `id` uuid PK
- `userEmail` varchar(254) not null — allows non-registered users to submit
- `userId` uuid FK → users.id nullable — null if user not registered
- `subject` varchar(300) not null
- `message` text not null
- `status` enum: `new` | `in_review` | `resolved` | `closed`
- `adminNote` text nullable — internal note field
- `resolvedAt` timestamp nullable
- `createdAt` timestamp

**`page_views`**
- `id` uuid PK
- `templateId` uuid FK → templates.id
- `sessionHash` varchar(64) not null — hashed session/visitor ID (no PII stored)
- `referrer` varchar(300) nullable
- `createdAt` timestamp

> Note: `page_views` is an append-only event log. Aggregated counts written back to `templates.viewCount` nightly or on-demand.

**`store_settings`**
- `key` varchar(100) PK
- `value` text not null
- `updatedAt` timestamp
- `updatedBy` uuid FK → users.id nullable

> Initial keys: `store_name`, `default_currency`, `aba_enabled`, `bakong_enabled`, `maintenance_mode`, `featured_template_ids`

---

## Phase 2 — Seed Real Data
> Goal: Enter real templates, vendor profiles, and categories so pages stop showing empty states.

### 2A — Admin Seed Flow (via Dashboard)
Build a simple seed/import form in the dashboard that lets admin:
1. Create vendor user accounts (role = VENDOR)
2. Create vendor profiles linked to those accounts
3. Upload templates: fill title, description, category, price, tech stack, upload zip → S3 → save `s3Key`
4. Set screen mockup images and documentation URLs

### 2B — Categories Seed
Insert the 4 initial categories matching the existing enum:
- `real-estate` — Real Estate
- `portfolio` — Portfolio
- `e-commerce` — E-Commerce
- `wedding` — Wedding

Add `displayOrder` and `iconSlug` so homepage can display them in a controlled order.

### 2C — Migration of Firestore Catalog
The current `CatalogProvider` uses Firestore `catalog/global` as a CRUD overlay on top of `mockTemplates`.

Migration plan:
1. Export any custom items added via Firestore admin panel to a JSON file
2. Import into PostgreSQL `templates` table
3. Switch `CatalogProvider` to fetch from a new API route `/api/catalog` (backed by PostgreSQL)
4. Remove Firestore catalog dependency entirely

---

## Phase 3 — Replace Mock Data with Real Queries
> Goal: Every page reads from PostgreSQL. Zero mock data in production flow.

### 3A — Template Queries
Create a `lib/db/queries/templates.ts` file with:
- `getTemplates(filters)` — homepage/products list with search, category, sort
- `getTemplateBySlug(slug)` — product detail page
- `getTemplateById(id)` — checkout, preview pages
- `getTemplatesByVendorId(vendorId)` — vendor profile page
- `getRelatedTemplates(templateId, category)` — product detail recommendations

### 3B — Vendor Queries
Create `lib/db/queries/vendors.ts`:
- `getVendorBySlug(slug)` — vendor profile page
- `getAllVendors()` — admin vendor management
- `getVendorStats(vendorId)` — revenue, downloads, rating per vendor

### 3C — Review Queries
Create `lib/db/queries/reviews.ts`:
- `getReviewsByTemplateId(templateId)` — product detail page (visible reviews only)
- `getAggregatedRating(templateId)` — returns avg rating + count
- `submitReview(...)` — already built in `app/actions/reviews.ts` ✅

### 3D — Update Catalog Provider
Replace `mockTemplates` base with PostgreSQL-backed API route:
- New route: `GET /api/catalog` — returns all active templates in `TemplateItem` shape
- `CatalogProvider` fetches this on mount, caches in memory (SWR or React Query)
- Firestore overlay for admin CRUD is removed; admin uses dashboard CRUD instead

### 3E — Vendor Page
Replace `getVendorBySlug()` and `getTemplatesByVendorSlug()` mock helpers with DB queries.

### 3F — Checkout Page
Replace `mockTemplates.find()` with `getTemplateById()` DB query.

---

## Phase 4 — Migrate Firestore to PostgreSQL
> Goal: Remove Firestore as a runtime dependency. Keep Firebase Analytics if needed.

### 4A — Support Tickets Migration
**Current:** Firestore `supportReports` collection via `lib/support/help-reports.ts`
**Target:** PostgreSQL `support_tickets` table

Steps:
1. Export existing Firestore `supportReports` documents
2. Import into `support_tickets` table
3. Rewrite `appendHelpReport()` to insert into PostgreSQL via a server action
4. Rewrite `subscribeHelpReports()` — replace Firestore real-time listener with:
   - Server action poll (simplest), OR
   - Server-Sent Events (SSE) endpoint for real-time feel in dashboard

### 4B — Catalog Management Migration
**Current:** Firestore `catalog/global` document stores `customItems`, `overrideItems`, `hiddenIds`
**Target:** PostgreSQL `templates` table (with `isActive` flag)

Steps:
1. Admin template CRUD moves to dashboard API routes backed by PostgreSQL
2. `hiddenIds` → set `templates.isActive = false`
3. `overrideItems` → update `templates` row directly
4. `customItems` → insert new `templates` row
5. Remove `CATALOG_DOC_REF` Firestore writes from `CatalogProvider`

### 4C — Remove Firebase Firestore Dependency
After 4A + 4B are done:
- Remove `getFirestore` from `lib/firebase/client.ts`
- Keep `getAuth` only if Google OAuth via Firebase is still needed (otherwise NextAuth handles it)
- Keep Firebase Analytics (`getAnalytics`) for front-end usage tracking (optional)
- Update `lib/firebase/client.ts` to be minimal

---

## Phase 5 — Analytics & Dashboard Data
> Goal: Power all 8 dashboard component sections with real aggregated data.

### 5A — API Routes for Dashboard Metrics
Create `app/api/dashboard/` with these endpoints (all require ADMIN role check):

| Endpoint | Powers | Query |
|---|---|---|
| `GET /api/dashboard/stats` | PerformanceMetrics | Total revenue, order count, user count, template count |
| `GET /api/dashboard/revenue-chart` | AnalyticsCharts | Revenue by day (last 30d), by category, by provider |
| `GET /api/dashboard/top-products` | AnalyticsCharts | Top 5 templates by revenue/downloads |
| `GET /api/dashboard/customers` | CustomerAnalytics | Total customers, repeat buyers, recent signups |
| `GET /api/dashboard/activity` | RecentActivityFeed | Last 20 events: purchases + tickets + reviews |
| `GET /api/dashboard/inventory` | InventoryManagement | All templates with views, downloads, rating, revenue |
| `GET /api/dashboard/vendors` | VendorManagement | All vendors with product count, total revenue, status |
| `GET /api/dashboard/revenue-breakdown` | RevenueBreakdown | Revenue grouped by payment provider |
| `GET /api/dashboard/support` | RecentActivityFeed | Open support tickets count + recent tickets |

### 5B — Page View Tracking
Add a lightweight server action `trackTemplateView(templateId)` called from product detail page:
- Inserts into `page_views` with hashed session ID (SHA-256 of session token — no PII)
- Periodically aggregates into `templates.viewCount` (nightly cron or on every 100th view)

### 5C — Download Count Tracking
`downloadActivities` table already exists. Add aggregation:
- On each download: insert to `downloadActivities` + increment `templates.downloadCount`

---

## Phase 6 — Wishlist Persistence
> Goal: Wishlisted items survive across devices for logged-in users.

**Current:** Client-side localStorage via `WishlistProvider`
**Target:** Hybrid — localStorage for guests, PostgreSQL for signed-in users

Steps:
1. Add `GET /api/wishlist` — returns wishlist template IDs for current session user
2. Add `POST /api/wishlist` — add/remove template ID (toggle)
3. On login: merge localStorage wishlist into DB
4. Update `WishlistProvider` to sync with API when session is active

---

## Phase 7 — Security Hardening
> Goal: Ensure all DB access follows least-privilege and no data leaks.

### Access Control Rules

| Table | Admin | Vendor | User | Guest |
|---|---|---|---|---|
| `users` | Full | Own row only | Own row only | None |
| `templates` | Full | Own templates | Read active | Read active |
| `vendor_profiles` | Full | Own profile | Read | Read |
| `purchases` | Full | None | Own rows | None |
| `transactions` | Full | None | Own rows | None |
| `reviews` | Full | Read | Own + read visible | Read visible |
| `wishlists` | Full | None | Own rows | None |
| `support_tickets` | Full | None | Own rows | Create only |
| `page_views` | Read | None | None | Create only |
| `store_settings` | Full | None | None | None |
| `downloadActivities` | Full | None | Own rows | None |

### Enforcement Strategy
- All DB writes happen in **Server Actions** or **API Route Handlers** — never from client components
- Every server action begins with `getServerSession()` check before any query
- Admin-only routes check `session.user.role === 'ADMIN'`
- Vendor actions check that the target resource's `vendorId` matches `session.user.id`
- `support_tickets` — guest creation via rate-limited API route (IP-based, 5 req/hour)
- `page_views` — sessionHash is SHA-256(sessionId + salt), never stores raw session token
- All `s3Key` download links are short-lived signed URLs (15 min expiry) generated server-side only

### Database Security
- All tables use UUID primary keys (no sequential integer IDs that enumerate resources)
- `licenseKey` in `purchases` is a separate UUID (not the purchase ID)
- Passwords only in `authCredentials.passwordHash` using bcrypt
- `emailVerificationTokens.tokenHash` stores only the hash, never the raw token
- Database URL only in server-side environment variable (`DATABASE_URL`) — never `NEXT_PUBLIC_`

---

## Phase 8 — Environment & Deployment Checklist
> Goal: Verify all secrets and configuration are in place before going live with real data.

### Required Environment Variables

**PostgreSQL (Primary DB)**
- `DATABASE_URL` — Neon / Supabase / Vercel Postgres connection string

**Firebase (Realtime — phase out after Phase 4)**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (analytics only)

**Auth**
- `NEXTAUTH_SECRET` — random 32-byte secret
- `NEXTAUTH_URL` — production URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (if Google OAuth enabled)

**Payments**
- `ABA_MERCHANT_ID` / `ABA_API_KEY`
- `BAKONG_API_KEY` / `BAKONG_MERCHANT_NAME`

**Storage**
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET` / `AWS_REGION`

**Email**
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — for verification emails

**Feature Flags**
- `NEXT_PUBLIC_EMAIL_AUTH_ENABLED=true`
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`

### Database Indexes to Add
- `templates(category)` — homepage category filter
- `templates(vendorId)` — vendor profile page
- `templates(slug)` — unique, product detail lookup
- `purchases(userId)` — library page
- `purchases(transactionId)` — success page
- `transactions(bankRef)` — already unique, payment webhook lookup
- `reviews(templateId)` — product detail reviews
- `wishlists(userId)` — wishlist page
- `support_tickets(status, createdAt)` — dashboard support view
- `page_views(templateId, createdAt)` — analytics aggregation

---

## Execution Order Summary

| Phase | Name | Dependency | Estimated Scope |
|---|---|---|---|
| 1 | Schema Completion | None | Schema migrations only |
| 2 | Seed Real Data | Phase 1 done | Admin data entry + S3 uploads |
| 3 | Replace Mock Data | Phase 2 done | Query layer + page rewrites |
| 4 | Remove Firestore | Phase 3 done | Help reports + catalog migration |
| 5 | Dashboard Analytics | Phase 3 done | API routes + dashboard components |
| 6 | Wishlist Persistence | Phase 3 done | API + provider update |
| 7 | Security Hardening | All phases done | Review + tighten all access |
| 8 | Deploy Checklist | All phases done | Env vars + indexes + final test |

---

## Key Architecture Decision: Firestore vs PostgreSQL

**Recommendation: Consolidate to PostgreSQL-only (after Phase 4)**

Reasons:
- Firestore is currently only used for 2 features: catalog CRUD + support tickets
- Both can be served by PostgreSQL with equal or better performance
- Single database reduces operational complexity, billing, and security surface area
- PostgreSQL supports complex analytics queries that Firestore cannot
- Existing payment/purchase/auth flows are 100% PostgreSQL — consistency is valuable
- Firestore real-time subscription for dashboard support alerts can be replaced with SSE (Server-Sent Events) from a PostgreSQL-backed endpoint

**Keep from Firebase:**
- Firebase Analytics (`getAnalytics`) — optional, for Google Analytics integration
- Firebase Auth — only if you want to add Firebase-specific social logins; otherwise NextAuth handles everything

---

*Plan version: 1.0 — Ready to begin Phase 1 on approval.*
