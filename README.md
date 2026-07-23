# Athidhi Restaurant Operating System

Athidhi ROS combines the public restaurant site, QR table ordering, and a
role-protected staff operating system for orders, kitchen, waiter requests,
billing, tables, menu, analytics, and settings.

## Security model

- Staff authenticate with Supabase email/password authentication.
- Supabase SSR stores staff sessions in secure, HttpOnly, SameSite cookies and
  refreshes them through `proxy.ts`.
- Every `/admin` route is authenticated on the server. Route access is enforced
  for `OWNER`, `MANAGER`, `CHEF`, `WAITER`, and `CASHIER`; an incorrect role
  receives HTTP 403.
- The normalized `staff.id` is the Supabase `auth.users.id`, which provides the
  required one-to-one auth-user mapping. Staff records also contain the
  restaurant, branch, role, name, and active status. Inactive staff are rejected.
- Customers do not create accounts or anonymous Supabase sessions. Opening a QR
  table issues a random capability token in a secure HttpOnly cookie. Only its
  HMAC hash is stored, and every guest order or service request validates both
  the requested table session and token.
- Browser mutations use same-origin checks plus a double-submit CSRF token.
  Login, table-session creation, orders, waiter requests, and bill requests are
  protected by durable database-backed rate limits.
- RLS, database functions, and API handlers all enforce tenant, branch,
  permission, and role boundaries. Client-side navigation is not an
  authorization boundary.
- Important login, order, service, settings, payment, and table-session events
  are written to `activity_logs` without secrets or raw client identifiers.
- Production responses enforce HTTPS, HSTS, a restrictive CSP, clickjacking and
  MIME protections, and no-store caching on admin/API responses.

## Staff routes

| Route | Roles |
| --- | --- |
| `/admin/dashboard` | Owner, Manager |
| `/admin/orders` | Owner, Manager |
| `/admin/live-tables` | Owner, Manager |
| `/admin/kitchen` | Owner, Manager, Chef |
| `/admin/waiter` | Owner, Manager, Waiter |
| `/admin/settings` | Owner, Manager (manager settings are limited) |
| `/admin/billing` | Owner, Cashier |

Unauthenticated staff are redirected to `/admin/login` and returned to their
authorized workspace after login. Authenticated staff are redirected away from
the login page. Logout invalidates the Supabase session.

## REST API

The versioned API starts at `/api/v1`. Successful responses use
`{ "data": ... }`; failures use a sanitized
`{ "error": { "code": "...", "message": "..." } }` envelope.

- `GET /api/v1` — API catalog and authentication summary
- `GET /api/v1/openapi` — OpenAPI 3.1 contract
- `GET /api/v1/restaurant` and `GET /api/v1/menu` — public restaurant data
- `GET /api/v1/security/csrf` — browser CSRF token
- `POST /api/v1/table-sessions` — open a secure QR table session
- `GET|POST /api/v1/orders` — authorized order tracking and placement
- `PATCH /api/v1/orders/{id}/status` — role-scoped kitchen workflow
- `GET|POST /api/v1/service-requests` — waiter and bill requests
- `GET|POST /api/v1/orders/{id}/payments` — cashier/management payments
- `GET|POST /api/v1/tables` — owner/manager table management
- `GET|POST /api/v1/menu/categories` and `/menu/items` — menu management
- `GET /api/v1/analytics` — management reporting
- `GET /api/v1/operations` — role-scoped staff workspace data
- `GET /api/v1/operations/stream` — branch-scoped staff realtime invalidations (SSE)
- `PATCH /api/v1/waiter-tasks/{id}/assignment` — assign or release a waiter task
- `GET|POST|DELETE /api/v1/auth/session` — staff session lifecycle

Staff browser requests use the HttpOnly Supabase session cookie. Trusted
non-browser staff clients may send `Authorization: Bearer <supabase-jwt>`.
Guest endpoints use the HttpOnly table-session cookie issued by
`POST /api/v1/table-sessions`. Browser state-changing requests must also send
the `x-csrf-token` returned by `GET /api/v1/security/csrf`.

## Environment

Copy `.env.example` to `.env.local`. Never commit real values.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
JWT_SECRET=at-least-32-random-bytes
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
APP_SURFACE=customer
```

`SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` are server-only. Never prefix them
with `NEXT_PUBLIC_`, embed them in source files, or expose them to the browser.

## Database setup

Docker Desktop is required for local Supabase:

```bash
npx supabase start
npx supabase db reset
```

The canonical migrations are
`supabase/migrations/20260723153000_production_auth_security.sql` and
`supabase/migrations/20260723170000_phase4_waiter_workspace.sql`; local reset
then runs `supabase/seed.sql`. Anonymous sign-in is disabled.

For a new hosted project, link the project and push migrations:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Then run `supabase/seed.sql` and the edited `supabase/create-owner.sql` in the
Supabase SQL editor. For a database originally created from the older
`supabase/schema.sql`, run `supabase/api-support.sql` once before deploying this
application.

Create the owner in Supabase Authentication first, replace the email in
`supabase/create-owner.sql`, and run it. Every authenticated account must have
exactly one active `staff` row before it can enter the admin application.

## Development

Run the customer and dedicated admin surfaces in separate terminals:

```bash
npm run dev
npm run dev:admin
```

The customer surface uses port 3000 and the admin surface uses port 3001.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build:vercel
```

The rendered tests verify public rendering, security headers, CSRF issuance,
admin redirects, protected staff APIs, the API catalog, and friendly health
errors. Run `npm run test:e2e` against a migrated development database for the
full QR-order, waiter-request, role, payment, and cleanup workflow.

## Deployment

The repository is connected to an OpenAI Sites project through
`.openai/hosting.json`. Configure all environment variables in the hosting
runtime, keep server-only values secret, apply the database migration, and only
then deploy the saved source version.
