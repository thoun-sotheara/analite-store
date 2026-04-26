This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## KHPay Setup

Set these environment variables before running checkout:

```bash
KHPAY_API_KEY=your_api_key
KHPAY_BASE_URL=https://api-sandbox.khpay.me/api/v1
KHPAY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_SITE_URL=https://analite-kit.vercel.app
```

Webhook endpoint:

```text
https://analite-kit.vercel.app/api/payments/webhook
```

The integration uses webhook-first confirmation with signature validation. Checkout status polling is also enabled as a fallback for resilience.

## Phase 8 Deployment Checklist

Validate required production environment variables:

```bash
npm run check:env
```

Use strict mode to enforce optional analytics keys too:

```bash
node scripts/check-env.mjs --strict
```

Apply DB migrations (including performance indexes in `drizzle/0002_phase8_indexes.sql`):

```bash
npx drizzle-kit migrate
```

Recommended order before production deploy:

1. Pull latest project env vars.
2. Run `npm run check:env`.
3. Run `npx drizzle-kit migrate`.
4. Deploy with `npx vercel --prod`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
