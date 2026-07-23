# Athidhi Restaurant Operating System

Athidhi ROS is a production application for the public restaurant website, QR
table ordering, kitchen operations, waiter requests, billing, table management,
menu management, analytics, and restaurant settings.

The customer application runs at `http://localhost:3000`. The protected staff
application runs at `http://localhost:3001`. Both use the same Supabase Auth,
PostgreSQL, and Realtime project.

## What is implemented

- Supabase Auth password sign-in for staff with database-backed roles
- Invisible anonymous Supabase Auth sessions for guests who scan a table QR
- Database-priced order creation with atomic PostgreSQL functions
- Live order tracking and kitchen status transitions
- Live waiter, water, cutlery, tissue, and bill requests
- Payment recording for UPI, cash, and card
- Real table state, capacity, and QR URL management
- Real menu CRUD, prices, availability, categories, and parcel charges
- Revenue, ticket, dish, and service-time analytics from orders and payments
- Restaurant profile, address, GST, hours, tax, and ordering settings
- Row Level Security for guest-owned data and branch-scoped staff data
- Supabase Realtime subscriptions for orders, items, requests, payments, tables,
  and menu availability
- Health endpoint at `/api/health`
- Cloudflare Sites/Vinext and Vercel production builds

## Local Supabase

Docker Desktop must be running.

```bash
npx supabase start
npx supabase db reset
```

The local Supabase configuration enables anonymous guest sign-in and executes
`supabase/schema.sql` followed by `supabase/seed.sql`.

Copy `.env.example` to `.env.local`, then use the API URL and anon key printed by
`npx supabase status`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
APP_SURFACE=customer
```

Create the first non-anonymous user in Supabase Studio Authentication. Update
the email in `supabase/create-owner.sql`, then run that file in the SQL editor.
The user will receive the seeded Owner role.

For a hosted Supabase project:

1. Enable Anonymous Sign-Ins in Authentication settings.
2. Add the customer and admin `/auth/callback` URLs to allowed redirects.
3. Run `supabase/schema.sql`, `supabase/seed.sql`, then the edited
   `supabase/create-owner.sql`.
4. Add the hosted URL and anon key to both application environments.

No service-role key is used by the web application.

## Run both applications

Use two terminals:

```bash
npm run dev
```

```bash
npm run dev:admin
```

The admin process sets `APP_SURFACE=admin`, so its root URL opens the protected
staff application. The customer process remains on port 3000.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build:vercel
```

`npm test` performs the Cloudflare/Vinext production build and verifies the
server-rendered customer surface and health behavior. `build:vercel` verifies
the native Next.js deployment output.

The database end-to-end test additionally needs the local service-role key for
test setup and cleanup only. It is never used by either web application:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="the local service-role key from supabase status"
npm run test:e2e
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

That test opens an anonymous QR session, places and prices an order, creates a
waiter request, verifies staff RLS, receives a Realtime update, advances the
kitchen workflow, records payment, and cleans up its temporary records.

## Vercel deployment

Create two Vercel projects from the same repository:

- Customer project: `APP_SURFACE=customer`
- Admin project: `APP_SURFACE=admin`

Give both projects the same `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Set `NEXT_PUBLIC_SITE_URL` to the customer
domain and `NEXT_PUBLIC_ADMIN_URL` to the admin domain. Add both callback URLs
to Supabase Auth.

Before opening to guests, update the restaurant phone, WhatsApp, address, GSTIN,
hours, and menu from the staff Settings and Menu screens.
