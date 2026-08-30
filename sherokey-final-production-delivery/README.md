# SHEROKEY — Digital Products E-Commerce Platform

SHEROKEY is a full-stack digital-goods storefront (license keys, digital
codes, downloads, and activation-based products) built with **Next.js (App
Router)**, **PostgreSQL**, and **Drizzle ORM**. It ships with a complete
storefront, customer account area, admin dashboard, payments (Stripe +
PayPal), license-key inventory management, coupons, reviews, support chat,
notifications, localization (English / Russian / Arabic with RTL), and
multi-currency pricing (USD / SAR / RUB).

This README is the client hand-over document: it explains how to install,
configure, run, and deploy the platform to a production environment with a
real PostgreSQL database and real payment credentials.

---

## 1. Requirements

- **Node.js** 20.x or newer (Next.js 16 requires a current Node LTS)
- **PostgreSQL** 14+ (any standard managed provider works: RDS, Supabase,
  Neon, DigitalOcean Managed Postgres, Railway, self-hosted, etc.)
- npm (bundled with Node)

---

## 2. Installation

```bash
npm install
```

---

## 3. Environment Configuration

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

All configuration is environment-driven — nothing is hardcoded. See the
comments in `.env.example` for full documentation of every variable. Summary:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. **Must** point at your production database in production — never `localhost`. |
| `AUTH_SECRET` | Random secret used for session security. Generate with `openssl rand -hex 32`. |
| `KEY_ENCRYPTION_SECRET` | Random secret used to encrypt license keys at rest (AES-256-GCM). Generate with `openssl rand -hex 32`. Losing/rotating this makes existing encrypted keys unreadable — back it up securely. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credentials for the initial administrator account created by `npm run db:seed`. Change the password after first login. |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM_NAME/FROM_EMAIL` | Transactional email. Leave `SMTP_HOST` blank to run in "console mode" (emails logged, not sent) — for local development only. |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_MODE` | PayPal REST credentials from the merchant's PayPal Developer Dashboard. `PAYPAL_MODE=sandbox` for testing, `live` for real transactions. PayPal checkout is automatically hidden unless both credentials are set. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe secret key + webhook signing secret for card payments (Stripe Checkout, PCI-compliant hosted flow). Card checkout is automatically hidden unless `STRIPE_SECRET_KEY` is set. |
| `NEXT_PUBLIC_SITE_URL` | Fully-qualified public URL of the deployment (used in emails, payment redirects, sitemap, canonical URLs). |

**Never commit `.env`.** It is already excluded via `.gitignore`.

---

## 4. Database

Schema is defined in `src/db/schema.ts` and managed with Drizzle ORM/Kit.

```bash
# Generate SQL migration files from the schema (optional, for migration-based workflows)
npm run db:generate

# Push the current schema directly to the configured DATABASE_URL (recommended
# for first deploys / simple environments — no migration files needed)
npm run db:push

# Apply generated migration files (if you used db:generate)
npm run db:migrate

# Seed baseline data: languages, currencies, default store settings, the
# initial admin account (from ADMIN_EMAIL/ADMIN_PASSWORD), demo catalog data,
# FAQs, and legal pages. The seed is idempotent — it only inserts rows that
# don't already exist and is safe to re-run against a live database without
# destroying or duplicating existing data.
npm run db:seed
```

Typical first-time production setup:

```bash
npm install
npm run db:push
npm run db:seed
npm run build
npm start
```

---

## 5. Development

```bash
npm run dev
```

Runs the app at `http://localhost:3000` against whatever `DATABASE_URL` is
configured in `.env`. With SMTP unset, emails are logged to the server
console instead of sent. With no Stripe/PayPal credentials configured,
checkout automatically falls back to a clearly-labeled sandbox test-mode
payment confirmation so the full cart → checkout → fulfillment pipeline can
be exercised end-to-end without live payment credentials. **This sandbox
fallback is automatically and permanently disabled the instant real Stripe or
PayPal credentials are present** — it can never produce a fake "paid" order
once a real payment provider is configured.

---

## 6. Production

```bash
npm run build
npm start
```

`npm start` runs `next start`, which serves the optimized production build on
the port provided by your hosting platform (or `3000` by default). Put this
behind a reverse proxy / load balancer that terminates HTTPS (e.g. Nginx,
Caddy, or your hosting provider's managed HTTPS).

Recommended production checklist:

- [ ] `DATABASE_URL` points at the client's production PostgreSQL instance (with `sslmode=require` if the provider requires TLS).
- [ ] `AUTH_SECRET` and `KEY_ENCRYPTION_SECRET` are strong, unique, and backed up securely (not the sandbox defaults).
- [ ] `ADMIN_PASSWORD` has been changed after first login.
- [ ] Real SMTP credentials are configured (no "console mode" in production).
- [ ] Real Stripe and/or PayPal credentials are configured for the payment methods you intend to offer. `PAYPAL_MODE=live` once you're ready to accept real payments.
- [ ] `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint you register in the Stripe Dashboard for `https://yourdomain.com/api/webhooks/stripe`.
- [ ] `NEXT_PUBLIC_SITE_URL` is the real HTTPS production domain.
- [ ] The app is served over HTTPS end-to-end (session cookies are marked `Secure` automatically when `NODE_ENV=production`).

---

## 7. Payment Setup

### PayPal

1. Create/sign in to a PayPal Business account (the store owner's account — this
   is the account that will receive payouts).
2. In the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/),
   create a REST app to obtain a **Client ID** and **Secret**.
3. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`.
4. Use `PAYPAL_MODE=sandbox` while testing with PayPal sandbox buyer/seller
   test accounts. Switch to `PAYPAL_MODE=live` with live credentials to accept
   real payments.
5. No further webhook configuration is required for the core flow: the order
   is captured and verified server-to-server (`/api/payments/paypal/return`)
   directly against PayPal's API before being marked paid — the browser
   redirect alone is never trusted.

### Card payments (Stripe)

1. Create/sign in to a Stripe account for the merchant.
2. Copy the **Secret key** from the Stripe Dashboard into `STRIPE_SECRET_KEY`.
3. Create a webhook endpoint in the Stripe Dashboard pointing to
   `https://yourdomain.com/api/webhooks/stripe`, subscribed to at minimum:
   `checkout.session.completed`, `checkout.session.expired`,
   `payment_intent.payment_failed`. Copy the endpoint's **Signing secret**
   into `STRIPE_WEBHOOK_SECRET`.
4. Card payments use Stripe-hosted Checkout — raw card numbers/CVV never
   reach the SHEROKEY server or database. Orders are marked `paid` only after
   a cryptographically verified webhook event, never based on the customer's
   browser redirect back to the success page.
5. Whichever card brands (Visa, Mastercard, Mir where supported by the
   merchant's Stripe/PayPal account and region, etc.) are enabled on your
   Stripe/PayPal account automatically become available at checkout — nothing
   needs to change in the SHEROKEY code. The payment layer
   (`src/lib/services/payments/*`) is intentionally isolated so additional
   providers can be added later without reworking checkout.

### If no payment provider is configured

Checkout offers a manual **bank transfer** option (order created as
`pending_payment`, fulfilled manually by an admin once funds are confirmed)
and, only in the absence of both Stripe and PayPal credentials, a clearly
labeled sandbox/test-mode instant-confirmation path intended purely for
development and demos. That test path is automatically and permanently
removed the moment real credentials are supplied — production deployments
with real credentials can never produce a fake successful payment.

---

## 8. Admin Setup

The first administrator account is created by `npm run db:seed`, using the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables at the time the seed
runs. If a user with that email already exists, the seed leaves it untouched
(the seed never overwrites existing accounts or resets passwords).

Sign in at `/admin/login`. Admin/manager access is enforced **server-side**
on every `/admin/*` page and every `/api/admin/*` route by re-checking the
authenticated session's role — a customer account can never gain admin
access via frontend manipulation.

To promote an additional user to admin/manager later, use the admin Users
section (`/admin/users`) while signed in as an existing administrator, or
update the `role` column for that user directly in the database.

---

## 9. Deployment (connecting a production PostgreSQL database)

1. Provision a PostgreSQL database with your hosting provider or a managed
   provider (Neon, Supabase, RDS, DigitalOcean, Railway, etc.).
2. Set `DATABASE_URL` in your hosting platform's environment variable
   settings to that database's connection string (include `sslmode=require`
   if required by the provider).
3. Run `npm run db:push` (or generate + `npm run db:migrate` if you prefer a
   migration-file workflow) against that `DATABASE_URL` to create the schema.
4. Run `npm run db:seed` once to create languages/currencies/default settings
   and the initial admin account. Safe to re-run at any time — it will not
   duplicate or destroy data.
5. Set all remaining production environment variables (SMTP, PayPal, Stripe,
   `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, `KEY_ENCRYPTION_SECRET`).
6. `npm run build && npm start`, fronted by HTTPS.

The application never assumes `localhost`, a local database, or local file
storage for business data — every environment-specific value is read from
`process.env` at runtime.

---

## 10. Architecture Overview

- **Storefront**: `src/app/[locale]/**` — localized (en/ar/ru) customer-facing
  pages: home, products, categories, search, cart, checkout, account, order
  history, support, legal/FAQ/content pages. Arabic renders RTL automatically.
- **Admin dashboard**: `src/app/admin/**` — products, variants, categories,
  license key inventory, orders, customers, coupons, reviews, support inbox,
  content management, settings, and dashboard statistics — all backed by real
  PostgreSQL queries (no mock data).
- **API routes**: `src/app/api/**` — authentication, cart, checkout, orders,
  reviews, wishlist, support, admin CRUD endpoints, and payment
  webhooks/callbacks.
- **Domain services**: `src/lib/services/**` — cart, pricing, coupons,
  orders/fulfillment, currency conversion, settings, email, support, audit
  logging, and the payment provider adapters (`payments/stripe.ts`,
  `payments/paypal.ts`).
- **Data layer**: `src/db/schema.ts` (Drizzle ORM schema) + `src/db/index.ts`
  (pooled `pg` connection, fully driven by `DATABASE_URL`).
- **Security**: `src/lib/auth.ts` (hashed passwords, server-side sessions via
  HTTP-only cookies), `src/lib/admin/guard.ts` (server-side RBAC for every
  admin API route), `src/lib/crypto.ts` (AES-256-GCM encryption for license
  keys at rest, key masking for admin listings), `src/middleware.ts` (locale
  routing + baseline security headers), `src/lib/rate-limit.ts` (brute-force
  protection on auth/checkout/lookup endpoints).

### Key production-hardening guarantees already built in

- **Server-authoritative pricing**: totals, discounts, taxes and currency
  conversion are always recalculated from the database during checkout — the
  browser never supplies a trusted price.
- **Idempotent, transaction-safe fulfillment**: `confirmOrderPayment` runs
  inside a single DB transaction with `SELECT ... FOR UPDATE` on the order and
  `FOR UPDATE SKIP LOCKED` when reserving license keys, so concurrent
  webhook/return callbacks (including duplicate webhook deliveries) can never
  double-fulfill an order or assign the same license key to two customers.
- **Verified payments only**: Stripe orders are marked paid only after a
  signature-verified webhook event; PayPal orders are captured and verified
  server-to-server against PayPal's API — never based on a client-side
  redirect alone.
- **License key confidentiality**: keys are stored AES-256-GCM encrypted,
  masked in admin listings, only decrypted for the owning customer at
  delivery time, and never written to logs.
