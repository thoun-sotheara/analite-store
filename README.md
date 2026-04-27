# Analite Kit

Analite Kit is a Next.js marketplace for premium templates with secure checkout, purchase-gated downloads, profile/library access, dashboard operations, and production deployment on Vercel.

## Core Capabilities

- Public catalog and product detail pages
- KHQR and PayWay checkout initialization
- Webhook-first payment completion
- Secure download links for completed purchases only
- Customer profile and library access actions
- Admin dashboard for orders, reports, and vendor management
- Email flows for signup verification and payment confirmation

## Tech Stack

- Next.js App Router
- TypeScript
- NextAuth
- Drizzle ORM + PostgreSQL
- Vercel hosting and routing

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Configure environment variables.

```bash
cp .env.example .env.local
```

3. Run the app.

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

## Environment Variables

Minimum required production variables (validated by `npm run check:env`):

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `KHPAY_PROXY_SECRET`
- `KHPAY_WEBHOOK_SECRET`
- `PAYMENT_ADMIN_SECRET`
- One of:
- `PAYWAY_LINK`
- `ABA_PAYWAY_LINK`
- `NEXT_PUBLIC_PAYWAY_LINK`
- `KHPAY_API_KEY`

Recommended:

- `ADMIN_EMAIL`
- `EMAIL_FROM`
- `EMAIL_SERVER_HOST`
- `EMAIL_SERVER_PORT`
- `EMAIL_SERVER_USER`
- `EMAIL_SERVER_PASSWORD`

## Useful Commands

```bash
# development
npm run dev

# production build
npm run build

# environment check
npm run check:env

# strict environment check
node scripts/check-env.mjs --strict

# run migrations
npx drizzle-kit migrate
```

## Payment and Security Notes

- Buyer endpoint `/api/payments/confirm` must not self-complete pending payments.
- Production webhook signature verification is required by default.
- Payment completion and purchase creation run through hardened finalization logic.
- Secure downloads require authenticated ownership of completed purchases.

## Production Runbook

Use this exact sequence for each release.

### 1) Preflight

```bash
npm run check:env
npm run build
```

Optional strict checks:

```bash
node scripts/check-env.mjs --strict
```

If schema changes exist:

```bash
npx drizzle-kit migrate
```

### 2) Deploy

```bash
vercel deploy --prod --yes
```

Then move primary alias:

```bash
vercel alias set <deployment-url> analite-kit.vercel.app
```

### 3) Live Smoke Tests (Authenticated)

Perform these checks while signed in to production.

1. Create checkout
- Endpoint: `POST /api/checkout`
- Expected: `200` with `transactionId`

2. Attempt owner confirm for pending payment
- Endpoint: `POST /api/payments/confirm`
- Expected: `409` with pending-provider-confirmation message

3. Read transaction status
- Endpoint: `GET /api/checkout/:transactionId`
- Expected: status remains `pending` (until real provider confirmation)

4. Existing account signup safety
- Endpoint: `POST /api/auth/signup` with existing verified email
- Expected: `409`

5. Catalog degraded fallback sanity
- Endpoint: `GET /api/catalog`
- Expected: `200`, categories non-empty, vendor present on items

### 4) Webhook Security Checks (Production)

1. Missing signature
- Expected: `401`

2. Invalid signature
- Expected: `401`

3. Signature required but secret missing
- Expected: `503`

### 5) Post-deploy Validation

For one real completed payment:

- Transaction moves to `completed`
- Purchases are created once (no duplication under concurrency)
- Download link works for owner
- Invoice endpoint works
- Payment confirmation email is delivered (if SMTP configured)

## Operational Monitoring Checklist

Watch error rates and response anomalies for:

- `/api/checkout`
- `/api/checkout/:transactionId`
- `/api/payments/confirm`
- `/api/webhooks/payment`
- `/api/downloads/secure`

Alert on:

- Spikes in webhook `401` or `503`
- Checkout `5xx`
- Download link generation failures

## Deployment Discipline

Keep this order for every release:

1. `npm run check:env`
2. `npm run build`
3. `vercel deploy --prod --yes`
4. `vercel alias set ... analite-kit.vercel.app`
5. Live smoke tests

Record each smoke test transaction ID for incident traceability.
