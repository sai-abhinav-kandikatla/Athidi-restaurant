-- Athidhi Restaurant Operating System — Supabase/PostgreSQL schema
create extension if not exists pgcrypto;

create type public.order_status as enum ('PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'BILLED', 'PAID', 'CANCELLED');
create type public.table_state as enum ('AVAILABLE', 'BROWSING', 'ORDERING', 'ORDER_PLACED', 'PREPARING', 'READY', 'DINING', 'BILL_REQUESTED', 'PAID', 'CLEANING');
create type public.payment_method as enum ('UPI', 'CASH', 'CARD');
create type public.request_type as enum ('BILL', 'WAITER', 'WATER', 'SPOON', 'TISSUE');
create type public.request_status as enum ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  phone text,
  whatsapp text,
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  name text not null,
  address text,
  timezone text not null default 'Asia/Kolkata',
  opens_at time,
  closes_at time,
  gstin text,
  created_at timestamptz not null default now()
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches on delete cascade,
  section_id uuid references public.sections on delete set null,
  number integer not null,
  capacity integer not null default 4 check (capacity > 0),
  qr_token uuid not null default gen_random_uuid(),
  state public.table_state not null default 'AVAILABLE',
  unique (branch_id, number),
  unique (qr_token)
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables on delete restrict,
  guest_token uuid not null default gen_random_uuid(),
  state public.table_state not null default 'BROWSING',
  guest_count integer check (guest_count > 0),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (guest_token)
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  parent_id uuid references public.menu_categories on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  unique (restaurant_id, slug)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  category_id uuid not null references public.menu_categories on delete restrict,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  is_veg boolean not null,
  available boolean not null default true,
  bestseller boolean not null default false,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity,
  branch_id uuid not null references public.branches on delete restrict,
  table_session_id uuid not null references public.table_sessions on delete restrict,
  status public.order_status not null default 'PLACED',
  subtotal numeric(10,2) not null default 0,
  parcel_charge numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  spice_level text check (spice_level in ('Mild', 'Medium', 'Spicy', 'Extra spicy')),
  placed_at timestamptz not null default now(),
  served_at timestamptz,
  paid_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  menu_item_id uuid not null references public.menu_items on delete restrict,
  item_name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  is_parcel boolean not null default false,
  parcel_charge numeric(10,2) not null default 0,
  notes text,
  line_total numeric(10,2) not null
);

create table public.kitchen_queue (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders on delete cascade,
  status public.order_status not null default 'PLACED',
  priority integer not null default 0,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete restrict,
  method public.payment_method not null,
  amount numeric(10,2) not null check (amount > 0),
  status text not null check (status in ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  provider_reference text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches on delete cascade,
  table_session_id uuid references public.table_sessions on delete cascade,
  request_type public.request_type not null,
  status public.request_status not null default 'OPEN',
  priority integer not null default 0,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  name text not null,
  permissions jsonb not null default '{}'::jsonb,
  unique (restaurant_id, name)
);

create table public.staff (
  id uuid primary key references auth.users on delete cascade,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  branch_id uuid references public.branches on delete set null,
  role_id uuid not null references public.roles on delete restrict,
  full_name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  branch_id uuid references public.branches on delete set null,
  staff_id uuid references public.staff on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index orders_branch_status_idx on public.orders (branch_id, status, placed_at desc);
create index sessions_table_open_idx on public.table_sessions (table_id, opened_at desc) where closed_at is null;
create index kitchen_status_idx on public.kitchen_queue (status, priority desc);
create index notifications_open_idx on public.notifications (branch_id, priority, created_at) where status <> 'RESOLVED';
create index menu_category_available_idx on public.menu_items (category_id, available, sort_order);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger menu_items_touch before update on public.menu_items for each row execute function public.touch_updated_at();

create or replace function public.enforce_biryani_parcel_charge() returns trigger language plpgsql as $$
declare category_name text;
begin
  select coalesce(parent.name, category.name) into category_name
  from public.menu_items item
  join public.menu_categories category on category.id = item.category_id
  left join public.menu_categories parent on parent.id = category.parent_id
  where item.id = new.menu_item_id;
  if new.is_parcel and category_name = 'Biryani' then new.parcel_charge = 10 * new.quantity; else new.parcel_charge = 0; end if;
  new.line_total = new.unit_price * new.quantity + new.parcel_charge;
  return new;
end $$;
create trigger order_item_parcel_charge before insert or update on public.order_items for each row execute function public.enforce_biryani_parcel_charge();

alter table public.restaurants enable row level security;
alter table public.branches enable row level security;
alter table public.tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.kitchen_queue enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.staff enable row level security;
alter table public.roles enable row level security;
alter table public.activity_logs enable row level security;

create policy "public can read active categories" on public.menu_categories for select using (active);
create policy "public can read available menu" on public.menu_items for select using (available);

-- Add authenticated staff policies after creating the first owner account.
-- Realtime publication for live service flow:
alter publication supabase_realtime add table public.orders, public.kitchen_queue, public.notifications, public.tables;
