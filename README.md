# Athidhi Restaurant Operating System

Athidhi ROS combines the public restaurant website, QR table ordering and the staff operations console in one responsive application.

## What is included

- Premium public website with story, menu, gallery, reviews, visit, privacy and terms pages
- No-login table ordering at `/table/[number]`
- Search, category and Veg/Non-Veg filters
- Cart quantities, kitchen notes, spice level and the ₹10 biryani parcel rule
- Live order progress and guest service requests
- Staff console at `/admin`
- Kitchen display, waiter queue, billing/POS, table map, menu availability and owner analytics
- PWA manifest, robots and sitemap metadata
- PostgreSQL/Supabase schema with realtime tables, indexes and the parcel-charge trigger

## Local development

Install dependencies and start the customer surface:

```bash
npm install
npm run dev
```

The customer site runs on `http://localhost:3000`. The staff console is available at `http://localhost:3000/admin`. To expose the same application separately on port 3001, run `npm run dev:admin` and open `http://localhost:3001/admin`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql`, followed by `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local` and add the project credentials.
4. Create the first owner in Supabase Auth, then add its matching `staff` record and role policies.

The current interface uses browser-local state so the complete interaction flow is immediately testable without credentials. Connect the supplied schema through a server-side data layer before accepting production orders.

## Required restaurant content

The supplied brief names menu categories but does not include the promised exact dish-and-price list. `app/lib/menu.ts` therefore contains an editable sample catalogue and `supabase/seed.sql` deliberately avoids claiming it as the official menu. Before launch, replace it with the restaurant’s verified list and confirm:

- Official phone and WhatsApp number
- Full street address and map destination
- Opening hours
- GSTIN and receipt details
- Production domain used by `app/sitemap.ts`

## Production build

```bash
npm run build
```
