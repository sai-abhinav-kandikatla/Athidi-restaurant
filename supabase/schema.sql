-- Athidhi Restaurant Operating System
-- Run once in a new Supabase project, then run seed.sql.

create extension if not exists pgcrypto;

create type public.order_status as enum (
  'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'BILLED', 'PAID', 'CANCELLED'
);
create type public.table_state as enum (
  'AVAILABLE', 'BROWSING', 'ORDERING', 'ORDER_PLACED', 'PREPARING',
  'READY', 'DINING', 'BILL_REQUESTED', 'PAID', 'CLEANING'
);
create type public.payment_method as enum ('UPI', 'CASH', 'CARD');
create type public.request_type as enum ('BILL', 'WAITER', 'WATER', 'SPOON', 'TISSUE');
create type public.request_status as enum ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  phone text,
  whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  tax_rate numeric(5,2) not null default 5 check (tax_rate between 0 and 100),
  qr_ordering_enabled boolean not null default true,
  parcel_charge_enabled boolean not null default true,
  realtime_alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  number integer not null check (number > 0),
  capacity integer not null default 4 check (capacity > 0),
  qr_token uuid not null default gen_random_uuid(),
  state public.table_state not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, number),
  unique (qr_token)
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables on delete restrict,
  auth_user_id uuid references auth.users on delete set null,
  state public.table_state not null default 'BROWSING',
  guest_count integer check (guest_count > 0),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index one_open_table_session_per_guest
  on public.table_sessions (table_id, auth_user_id)
  where closed_at is null;

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
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  billed_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  menu_item_id uuid not null references public.menu_items on delete restrict,
  item_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0 and quantity <= 50),
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
  recorded_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches on delete cascade,
  table_session_id uuid not null references public.table_sessions on delete cascade,
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
create index orders_session_idx on public.orders (table_session_id, placed_at desc);
create index sessions_table_open_idx on public.table_sessions (table_id, opened_at desc) where closed_at is null;
create index sessions_user_open_idx on public.table_sessions (auth_user_id, opened_at desc) where closed_at is null;
create index kitchen_status_idx on public.kitchen_queue (status, priority desc);
create index notifications_open_idx on public.notifications (branch_id, priority desc, created_at) where status <> 'RESOLVED';
create index menu_category_available_idx on public.menu_items (category_id, available, sort_order);
create index payments_order_idx on public.payments (order_id, created_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_touch before update on public.restaurants
for each row execute function public.touch_updated_at();
create trigger branches_touch before update on public.branches
for each row execute function public.touch_updated_at();
create trigger tables_touch before update on public.tables
for each row execute function public.touch_updated_at();
create trigger menu_items_touch before update on public.menu_items
for each row execute function public.touch_updated_at();

create or replace function public.current_staff_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.restaurant_id
  from public.staff s
  where s.id = auth.uid() and s.active
  limit 1;
$$;

create or replace function public.current_staff_branch_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.branch_id
  from public.staff s
  where s.id = auth.uid() and s.active
  limit 1;
$$;

create or replace function public.staff_has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((r.permissions ->> permission_name)::boolean, false)
  from public.staff s
  join public.roles r on r.id = s.role_id
  where s.id = auth.uid() and s.active
  limit 1;
$$;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select upper(r.name)
  from public.staff s
  join public.roles r on r.id = s.role_id
  where s.id = auth.uid()
    and s.active
  limit 1;
$$;

create or replace function public.open_table_session(p_qr_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_table public.tables%rowtype;
  target_branch public.branches%rowtype;
  existing_session public.table_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select * into target_table from public.tables where qr_token = p_qr_token;
  if not found then raise exception 'Table QR code is invalid'; end if;

  select * into target_branch from public.branches where id = target_table.branch_id;
  if not target_branch.qr_ordering_enabled then
    raise exception 'Table ordering is temporarily unavailable';
  end if;

  select * into existing_session
  from public.table_sessions
  where table_id = target_table.id
    and auth_user_id = auth.uid()
    and closed_at is null
  order by opened_at desc
  limit 1;

  if not found then
    insert into public.table_sessions (table_id, auth_user_id, state)
    values (target_table.id, auth.uid(), 'BROWSING')
    returning * into existing_session;
  end if;

  if target_table.state = 'AVAILABLE' then
    update public.tables set state = 'BROWSING' where id = target_table.id;
  end if;

  return jsonb_build_object(
    'session_id', existing_session.id,
    'table_id', target_table.id,
    'table_number', target_table.number,
    'branch_id', target_table.branch_id,
    'branch_name', target_branch.name,
    'tax_rate', target_branch.tax_rate,
    'parcel_charge_enabled', target_branch.parcel_charge_enabled
  );
end;
$$;

create or replace function public.place_table_order(
  p_table_session_id uuid,
  p_items jsonb,
  p_notes text default null,
  p_spice_level text default 'Medium',
  p_is_parcel boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.table_sessions%rowtype;
  target_table public.tables%rowtype;
  target_branch public.branches%rowtype;
  new_order public.orders%rowtype;
  supplied_count integer;
  inserted_count integer;
  subtotal_value numeric(10,2);
  parcel_value numeric(10,2);
  tax_value numeric(10,2);
  total_value numeric(10,2);
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one menu item is required';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Order is too large'; end if;
  if p_spice_level not in ('Mild', 'Medium', 'Spicy', 'Extra spicy') then
    raise exception 'Invalid spice level';
  end if;

  select * into target_session
  from public.table_sessions
  where id = p_table_session_id and auth_user_id = auth.uid() and closed_at is null
  for update;
  if not found then raise exception 'Table session is invalid or closed'; end if;

  select * into target_table from public.tables where id = target_session.table_id for update;
  select * into target_branch from public.branches where id = target_table.branch_id;
  if not target_branch.qr_ordering_enabled then
    raise exception 'Table ordering is temporarily unavailable';
  end if;

  select count(*) into supplied_count from jsonb_to_recordset(p_items) as x(menu_item_id uuid, quantity integer);
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(menu_item_id uuid, quantity integer)
    where x.quantity is null or x.quantity <= 0 or x.quantity > 50
  ) then raise exception 'Invalid item quantity'; end if;

  insert into public.orders (branch_id, table_session_id, notes, spice_level)
  values (
    target_table.branch_id,
    target_session.id,
    nullif(left(trim(coalesce(p_notes, '')), 500), ''),
    p_spice_level
  )
  returning * into new_order;

  insert into public.order_items (
    order_id, menu_item_id, item_name, unit_price, quantity, is_parcel, parcel_charge, line_total
  )
  select
    new_order.id,
    item.id,
    item.name,
    item.price,
    requested.quantity,
    p_is_parcel,
    case
      when p_is_parcel and target_branch.parcel_charge_enabled and lower(category.name) = 'biryani'
        then 10 * requested.quantity
      else 0
    end,
    item.price * requested.quantity +
      case
        when p_is_parcel and target_branch.parcel_charge_enabled and lower(category.name) = 'biryani'
          then 10 * requested.quantity
        else 0
      end
  from jsonb_to_recordset(p_items) as requested(menu_item_id uuid, quantity integer)
  join public.menu_items item on item.id = requested.menu_item_id
  join public.menu_categories category on category.id = item.category_id
  where item.available and category.active and item.restaurant_id = target_branch.restaurant_id;

  get diagnostics inserted_count = row_count;
  if inserted_count <> supplied_count then
    raise exception 'One or more dishes are unavailable';
  end if;

  select
    coalesce(sum(unit_price * quantity), 0),
    coalesce(sum(parcel_charge), 0)
  into subtotal_value, parcel_value
  from public.order_items
  where order_id = new_order.id;

  tax_value := round((subtotal_value + parcel_value) * target_branch.tax_rate / 100, 2);
  total_value := subtotal_value + parcel_value + tax_value;

  update public.orders
  set subtotal = subtotal_value, parcel_charge = parcel_value, tax = tax_value, total = total_value
  where id = new_order.id;

  insert into public.kitchen_queue (order_id, status) values (new_order.id, 'PLACED');
  update public.table_sessions set state = 'ORDER_PLACED' where id = target_session.id;
  update public.tables set state = 'ORDER_PLACED' where id = target_table.id;

  return jsonb_build_object(
    'id', new_order.id,
    'order_number', new_order.order_number,
    'status', 'PLACED',
    'subtotal', subtotal_value,
    'parcel_charge', parcel_value,
    'tax', tax_value,
    'total', total_value
  );
end;
$$;

create or replace function public.create_service_request(
  p_table_session_id uuid,
  p_request_type public.request_type
)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.table_sessions%rowtype;
  target_table public.tables%rowtype;
  result public.notifications%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select * into target_session
  from public.table_sessions
  where id = p_table_session_id and auth_user_id = auth.uid() and closed_at is null;
  if not found then raise exception 'Table session is invalid or closed'; end if;
  select * into target_table from public.tables where id = target_session.table_id;

  if p_request_type = 'BILL' and exists (
    select 1
    from public.orders
    where table_session_id = target_session.id
      and status in ('PLACED', 'ACCEPTED', 'PREPARING', 'READY')
  ) then
    raise exception 'Bill cannot be requested before all food is served';
  end if;

  select * into result
  from public.notifications
  where table_session_id = target_session.id
    and request_type = p_request_type
    and status <> 'RESOLVED'
  order by created_at desc
  limit 1;
  if found then return result; end if;

  insert into public.notifications (
    branch_id, table_session_id, request_type, priority
  ) values (
    target_table.branch_id,
    target_session.id,
    p_request_type,
    case when p_request_type = 'BILL' then 10 when p_request_type = 'WAITER' then 5 else 0 end
  )
  returning * into result;

  if p_request_type = 'BILL' then
    update public.tables set state = 'BILL_REQUESTED' where id = target_table.id;
    update public.table_sessions set state = 'BILL_REQUESTED' where id = target_session.id;
    update public.orders
      set status = 'BILLED', billed_at = coalesce(billed_at, now())
      where table_session_id = target_session.id and status = 'SERVED';
  end if;
  return result;
end;
$$;

create or replace function public.advance_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  target_session public.table_sessions%rowtype;
  target_table public.tables%rowtype;
  status_rank integer;
  target_rank integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('order:' || p_order_id::text, 0)
  );
  select * into target_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if public.current_staff_restaurant_id() is null then raise exception 'Staff access required'; end if;
  if target_order.branch_id <> public.current_staff_branch_id()
    and not public.staff_has_permission('manage_all_branches') then
    raise exception 'Order belongs to another branch';
  end if;
  if p_status in ('PAID', 'CANCELLED') then raise exception 'Use the payment or cancellation workflow'; end if;
  if public.current_staff_role() = 'WAITER' and p_status = 'SERVED' and exists (
    select 1
    from (
      select action, staff_id
      from public.activity_logs
      where entity_type = 'order'
        and entity_id = p_order_id
        and action in ('WAITER_ASSIGNED', 'WAITER_UNASSIGNED')
      order by id desc
      limit 1
    ) latest_assignment
    where latest_assignment.action = 'WAITER_ASSIGNED'
      and latest_assignment.staff_id <> auth.uid()
  ) then
    raise exception 'Waiter task is assigned to another staff member';
  end if;

  status_rank := array_position(
    array['PLACED','ACCEPTED','PREPARING','READY','SERVED','BILLED']::text[],
    target_order.status::text
  );
  target_rank := array_position(
    array['PLACED','ACCEPTED','PREPARING','READY','SERVED','BILLED']::text[],
    p_status::text
  );
  if status_rank is null or target_rank is null or target_rank <> status_rank + 1 then
    raise exception 'Invalid order status transition';
  end if;

  update public.orders set
    status = p_status,
    accepted_at = case when p_status = 'ACCEPTED' then now() else accepted_at end,
    preparing_at = case when p_status = 'PREPARING' then now() else preparing_at end,
    ready_at = case when p_status = 'READY' then now() else ready_at end,
    served_at = case when p_status = 'SERVED' then now() else served_at end,
    billed_at = case when p_status = 'BILLED' then now() else billed_at end
  where id = p_order_id
  returning * into target_order;

  update public.kitchen_queue set
    status = p_status,
    accepted_at = case when p_status = 'ACCEPTED' then now() else accepted_at end,
    preparing_at = case when p_status = 'PREPARING' then now() else preparing_at end,
    ready_at = case when p_status = 'READY' then now() else ready_at end,
    completed_at = case when p_status in ('SERVED', 'BILLED') then now() else completed_at end
  where order_id = p_order_id;

  select * into target_session from public.table_sessions where id = target_order.table_session_id;
  select * into target_table from public.tables where id = target_session.table_id;
  update public.table_sessions set state =
    case p_status when 'PREPARING' then 'PREPARING'::public.table_state
      when 'READY' then 'READY'::public.table_state
      when 'SERVED' then 'DINING'::public.table_state
      when 'BILLED' then 'BILL_REQUESTED'::public.table_state
      else state end
  where id = target_session.id;
  update public.tables set state =
    case p_status when 'PREPARING' then 'PREPARING'::public.table_state
      when 'READY' then 'READY'::public.table_state
      when 'SERVED' then 'DINING'::public.table_state
      when 'BILLED' then 'BILL_REQUESTED'::public.table_state
      else state end
  where id = target_table.id;

  insert into public.activity_logs (restaurant_id, branch_id, staff_id, action, entity_type, entity_id, data)
  values (
    public.current_staff_restaurant_id(), target_order.branch_id, auth.uid(),
    'ORDER_STATUS_CHANGED', 'order', target_order.id, jsonb_build_object('status', p_status)
  );
  return target_order;
end;
$$;

create or replace function public.record_payment(
  p_order_id uuid,
  p_method public.payment_method,
  p_amount numeric,
  p_provider_reference text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  target_session public.table_sessions%rowtype;
  result public.payments%rowtype;
  paid_total numeric(10,2);
begin
  select * into target_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if public.current_staff_restaurant_id() is null then raise exception 'Staff access required'; end if;
  if target_order.branch_id <> public.current_staff_branch_id()
    and not public.staff_has_permission('manage_all_branches') then
    raise exception 'Order belongs to another branch';
  end if;
  if target_order.status <> 'BILLED' then raise exception 'Order cannot be paid'; end if;
  if p_amount <= 0 then raise exception 'Payment amount must be positive'; end if;

  select coalesce(sum(amount), 0) into paid_total
  from public.payments
  where order_id = target_order.id and status = 'SUCCESS';
  if p_amount > target_order.total - paid_total then
    raise exception 'Payment amount exceeds outstanding balance';
  end if;

  insert into public.payments (
    order_id, method, amount, status, provider_reference, recorded_by
  ) values (
    target_order.id, p_method, p_amount, 'SUCCESS', nullif(trim(p_provider_reference), ''), auth.uid()
  )
  returning * into result;

  paid_total := paid_total + p_amount;

  if paid_total = target_order.total then
    update public.orders set status = 'PAID', paid_at = now() where id = target_order.id;
    select * into target_session from public.table_sessions where id = target_order.table_session_id;
    if not exists (
      select 1 from public.orders
      where table_session_id = target_session.id
        and id <> target_order.id
        and status not in ('PAID', 'CANCELLED')
    ) then
      update public.table_sessions set state = 'PAID', closed_at = now() where id = target_session.id;
      update public.tables set state = 'CLEANING' where id = target_session.table_id;
      update public.notifications set status = 'RESOLVED', resolved_at = now()
        where table_session_id = target_session.id and status <> 'RESOLVED';
    end if;
  end if;

  insert into public.activity_logs (restaurant_id, branch_id, staff_id, action, entity_type, entity_id, data)
  values (
    public.current_staff_restaurant_id(), target_order.branch_id, auth.uid(),
    'PAYMENT_RECORDED', 'order', target_order.id,
    jsonb_build_object('method', p_method, 'amount', p_amount)
  );
  return result;
end;
$$;

alter table public.restaurants enable row level security;
alter table public.branches enable row level security;
alter table public.sections enable row level security;
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

create policy "public restaurant profile" on public.restaurants
for select using (true);
create policy "staff manage restaurant" on public.restaurants
for update using (id = public.current_staff_restaurant_id())
with check (id = public.current_staff_restaurant_id());

create policy "public branch profile" on public.branches
for select using (true);
create policy "staff manage branch" on public.branches
for update using (
  restaurant_id = public.current_staff_restaurant_id()
  and (id = public.current_staff_branch_id() or public.staff_has_permission('manage_all_branches'))
)
with check (restaurant_id = public.current_staff_restaurant_id());

create policy "staff read sections" on public.sections
for select using (branch_id = public.current_staff_branch_id());
create policy "staff manage sections" on public.sections
for all using (branch_id = public.current_staff_branch_id())
with check (branch_id = public.current_staff_branch_id());

create policy "staff read tables" on public.tables
for select using (
  branch_id = public.current_staff_branch_id()
  or public.staff_has_permission('manage_all_branches')
);
create policy "staff manage tables" on public.tables
for all using (
  branch_id = public.current_staff_branch_id()
  or public.staff_has_permission('manage_all_branches')
)
with check (
  branch_id = public.current_staff_branch_id()
  or public.staff_has_permission('manage_all_branches')
);

create policy "guest reads own session" on public.table_sessions
for select using (auth_user_id = auth.uid());
create policy "staff reads sessions" on public.table_sessions
for select using (
  exists (
    select 1 from public.tables t
    where t.id = table_id
      and (t.branch_id = public.current_staff_branch_id() or public.staff_has_permission('manage_all_branches'))
  )
);
create policy "staff updates sessions" on public.table_sessions
for update using (
  exists (select 1 from public.tables t where t.id = table_id and t.branch_id = public.current_staff_branch_id())
);

create policy "public active categories" on public.menu_categories
for select using (active or restaurant_id = public.current_staff_restaurant_id());
create policy "staff manage categories" on public.menu_categories
for all using (restaurant_id = public.current_staff_restaurant_id())
with check (restaurant_id = public.current_staff_restaurant_id());

create policy "public available menu" on public.menu_items
for select using (
  (
    available
    and exists (
      select 1 from public.menu_categories category
      where category.id = category_id and category.active
    )
  )
  or restaurant_id = public.current_staff_restaurant_id()
);
create policy "staff manage menu" on public.menu_items
for all using (restaurant_id = public.current_staff_restaurant_id())
with check (restaurant_id = public.current_staff_restaurant_id());

create policy "guest reads own orders" on public.orders
for select using (
  exists (
    select 1 from public.table_sessions s
    where s.id = table_session_id and s.auth_user_id = auth.uid()
  )
);
create policy "staff reads orders" on public.orders
for select using (
  branch_id = public.current_staff_branch_id()
  or public.staff_has_permission('manage_all_branches')
);

create policy "guest reads own order items" on public.order_items
for select using (
  exists (
    select 1
    from public.orders o
    join public.table_sessions s on s.id = o.table_session_id
    where o.id = order_id and s.auth_user_id = auth.uid()
  )
);
create policy "staff reads order items" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.branch_id = public.current_staff_branch_id() or public.staff_has_permission('manage_all_branches'))
  )
);

create policy "staff reads kitchen queue" on public.kitchen_queue
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.branch_id = public.current_staff_branch_id() or public.staff_has_permission('manage_all_branches'))
  )
);

create policy "staff reads payments" on public.payments
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.branch_id = public.current_staff_branch_id() or public.staff_has_permission('manage_all_branches'))
  )
);

create policy "guest reads own requests" on public.notifications
for select using (
  exists (
    select 1 from public.table_sessions s
    where s.id = table_session_id and s.auth_user_id = auth.uid()
  )
);
create policy "staff reads requests" on public.notifications
for select using (
  branch_id = public.current_staff_branch_id()
  or public.staff_has_permission('manage_all_branches')
);
create policy "staff updates requests" on public.notifications
for update using (
  branch_id = public.current_staff_branch_id()
  or public.staff_has_permission('manage_all_branches')
)
with check (
  branch_id = public.current_staff_branch_id()
  or public.staff_has_permission('manage_all_branches')
);

create policy "staff reads self" on public.staff
for select using (
  id = auth.uid()
  or restaurant_id = public.current_staff_restaurant_id()
);
create policy "owner manages staff" on public.staff
for all using (public.staff_has_permission('manage_staff'))
with check (restaurant_id = public.current_staff_restaurant_id());

create policy "staff reads roles" on public.roles
for select using (restaurant_id = public.current_staff_restaurant_id());
create policy "owner manages roles" on public.roles
for all using (public.staff_has_permission('manage_staff'))
with check (restaurant_id = public.current_staff_restaurant_id());

create policy "staff reads activity" on public.activity_logs
for select using (
  restaurant_id = public.current_staff_restaurant_id()
  and public.staff_has_permission('view_analytics')
);

grant usage on schema public to anon, authenticated;
grant select on public.restaurants, public.branches, public.menu_categories, public.menu_items to anon, authenticated;
grant select on public.sections, public.tables, public.table_sessions, public.orders,
  public.order_items, public.kitchen_queue, public.payments, public.notifications,
  public.roles, public.staff, public.activity_logs to authenticated;
grant insert, update, delete on public.sections, public.tables, public.menu_categories,
  public.menu_items, public.staff, public.roles to authenticated;
grant update on public.restaurants, public.branches, public.table_sessions, public.notifications to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.open_table_session(uuid) to authenticated;
grant execute on function public.place_table_order(uuid, jsonb, text, text, boolean) to authenticated;
grant execute on function public.create_service_request(uuid, public.request_type) to authenticated;
grant execute on function public.advance_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.record_payment(uuid, public.payment_method, numeric, text) to authenticated;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter publication supabase_realtime add table
  public.orders,
  public.order_items,
  public.kitchen_queue,
  public.notifications,
  public.tables,
  public.menu_categories,
  public.menu_items,
  public.payments;

-- Phase 4 waiter workspace: durable operational events and task assignment.

create or replace function public.log_waiter_order_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_restaurant_id uuid;
  target_table_id uuid;
  target_table_number integer;
  event_action text;
begin
  if old.status is not distinct from new.status
    or new.status not in ('READY', 'SERVED') then
    return new;
  end if;

  select b.restaurant_id, t.id, t.number
    into target_restaurant_id, target_table_id, target_table_number
  from public.table_sessions ts
  join public.tables t on t.id = ts.table_id
  join public.branches b on b.id = t.branch_id
  where ts.id = new.table_session_id;

  event_action := case new.status
    when 'READY' then 'FOOD_READY'
    else 'DELIVERY_COMPLETED'
  end;

  insert into public.activity_logs (
    restaurant_id, branch_id, staff_id, action, entity_type, entity_id, data
  )
  values (
    target_restaurant_id,
    new.branch_id,
    auth.uid(),
    event_action,
    'order',
    new.id,
    jsonb_build_object(
      'status', new.status,
      'orderNumber', new.order_number,
      'tableSessionId', new.table_session_id,
      'tableId', target_table_id,
      'tableNumber', target_table_number,
      'readyAt', new.ready_at,
      'servedAt', new.served_at,
      'deliverySeconds',
        case
          when new.ready_at is not null and new.served_at is not null
            then greatest(0, round(extract(epoch from (new.served_at - new.ready_at))))
          else null
        end
    )
  );
  return new;
end;
$$;

drop trigger if exists orders_waiter_event on public.orders;
create trigger orders_waiter_event
after update of status on public.orders
for each row execute function public.log_waiter_order_event();

create or replace function public.log_service_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_restaurant_id uuid;
  target_table_id uuid;
  target_table_number integer;
begin
  select b.restaurant_id, t.id, t.number
    into target_restaurant_id, target_table_id, target_table_number
  from public.table_sessions ts
  join public.tables t on t.id = ts.table_id
  join public.branches b on b.id = t.branch_id
  where ts.id = new.table_session_id;

  insert into public.activity_logs (
    restaurant_id, branch_id, staff_id, action, entity_type, entity_id, data
  )
  values (
    target_restaurant_id,
    new.branch_id,
    auth.uid(),
    'REQUEST_CREATED',
    'service_request',
    new.id,
    jsonb_build_object(
      'requestType', new.request_type,
      'status', new.status,
      'tableSessionId', new.table_session_id,
      'tableId', target_table_id,
      'tableNumber', target_table_number,
      'requestedAt', new.created_at
    )
  );
  return new;
end;
$$;

drop trigger if exists service_request_created_event on public.notifications;
create trigger service_request_created_event
after insert on public.notifications
for each row execute function public.log_service_request_created();

create or replace function public.log_service_request_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_restaurant_id uuid;
  target_table_id uuid;
  target_table_number integer;
  response_at timestamptz;
  response_seconds numeric;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  select b.restaurant_id, t.id, t.number
    into target_restaurant_id, target_table_id, target_table_number
  from public.table_sessions ts
  join public.tables t on t.id = ts.table_id
  join public.branches b on b.id = t.branch_id
  where ts.id = new.table_session_id;

  response_at := coalesce(new.acknowledged_at, new.resolved_at);
  response_seconds := case
    when response_at is not null
      then greatest(0, round(extract(epoch from (response_at - new.created_at))))
    else null
  end;

  if old.acknowledged_at is null
    and new.acknowledged_at is not null then
    insert into public.activity_logs (
      restaurant_id, branch_id, staff_id, action, entity_type, entity_id, data
    )
    values (
      target_restaurant_id,
      new.branch_id,
      auth.uid(),
      'WAITER_RESPONSE',
      'service_request',
      new.id,
      jsonb_build_object(
        'requestType', new.request_type,
        'status', new.status,
        'tableSessionId', new.table_session_id,
        'tableId', target_table_id,
        'tableNumber', target_table_number,
        'responseSeconds', response_seconds,
        'respondedAt', response_at
      )
    );
  end if;

  insert into public.activity_logs (
    restaurant_id, branch_id, staff_id, action, entity_type, entity_id, data
  )
  values (
    target_restaurant_id,
    new.branch_id,
    auth.uid(),
    case new.status
      when 'ACKNOWLEDGED' then 'REQUEST_ACKNOWLEDGED'
      when 'RESOLVED' then 'REQUEST_RESOLVED'
      else 'REQUEST_STATUS_CHANGED'
    end,
    'service_request',
    new.id,
    jsonb_build_object(
      'requestType', new.request_type,
      'status', new.status,
      'tableSessionId', new.table_session_id,
      'tableId', target_table_id,
      'tableNumber', target_table_number,
      'responseSeconds', response_seconds,
      'resolvedAt', new.resolved_at
    )
  );
  return new;
end;
$$;

drop trigger if exists service_request_response_event on public.notifications;
create trigger service_request_response_event
after update of status on public.notifications
for each row execute function public.log_service_request_response();

create or replace function public.update_service_request_status(
  p_request_id uuid,
  p_status public.request_status
)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.notifications%rowtype;
  staff_role text;
  v_now timestamptz := now();
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('service_request:' || p_request_id::text, 0)
  );
  if p_status not in ('ACKNOWLEDGED', 'RESOLVED') then
    raise exception 'Invalid service request status';
  end if;
  if public.current_staff_restaurant_id() is null
    or not public.staff_has_permission('manage_tables') then
    raise exception 'Staff access required';
  end if;

  staff_role := public.current_staff_role();
  if staff_role not in ('OWNER', 'MANAGER', 'WAITER') then
    raise exception 'Staff role cannot manage waiter tasks';
  end if;

  select * into target_request
  from public.notifications
  where id = p_request_id
  for update;
  if not found then raise exception 'Service request not found'; end if;
  if target_request.branch_id <> public.current_staff_branch_id()
    and not public.staff_has_permission('manage_all_branches') then
    raise exception 'Service request belongs to another branch';
  end if;
  if staff_role = 'WAITER' and exists (
    select 1
    from (
      select action, staff_id
      from public.activity_logs
      where entity_type = 'service_request'
        and entity_id = p_request_id
        and action in ('WAITER_ASSIGNED', 'WAITER_UNASSIGNED')
      order by id desc
      limit 1
    ) latest_assignment
    where latest_assignment.action = 'WAITER_ASSIGNED'
      and latest_assignment.staff_id <> auth.uid()
  ) then
    raise exception 'Waiter task is assigned to another staff member';
  end if;

  if target_request.status = 'RESOLVED' then
    return target_request;
  end if;
  if target_request.status = p_status then
    return target_request;
  end if;

  update public.notifications
  set
    status = p_status,
    acknowledged_at = coalesce(acknowledged_at, v_now),
    resolved_at = case
      when p_status = 'RESOLVED' then coalesce(resolved_at, v_now)
      else resolved_at
    end
  where id = p_request_id
  returning * into target_request;

  return target_request;
end;
$$;

create or replace function public.set_waiter_task_assignment(
  p_entity_type text,
  p_entity_id uuid,
  p_assigned boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_role text;
  target_branch_id uuid;
  target_table_session_id uuid;
  target_table_id uuid;
  target_table_number integer;
  target_staff_name text;
  current_assignment public.activity_logs%rowtype;
  assignment_found boolean;
  v_now timestamptz := now();
begin
  if p_entity_type not in ('order', 'service_request') then
    raise exception 'Waiter task is unavailable';
  end if;
  if public.current_staff_restaurant_id() is null
    or not public.staff_has_permission('manage_tables') then
    raise exception 'Staff access required';
  end if;

  staff_role := public.current_staff_role();
  if staff_role not in ('OWNER', 'MANAGER', 'WAITER') then
    raise exception 'Staff role cannot manage waiter tasks';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_entity_type || ':' || p_entity_id::text, 0)
  );

  if p_entity_type = 'order' then
    select o.branch_id, o.table_session_id, t.id, t.number
      into target_branch_id, target_table_session_id, target_table_id, target_table_number
    from public.orders o
    join public.table_sessions ts on ts.id = o.table_session_id
    join public.tables t on t.id = ts.table_id
    where o.id = p_entity_id and o.status = 'READY';
  else
    select n.branch_id, n.table_session_id, t.id, t.number
      into target_branch_id, target_table_session_id, target_table_id, target_table_number
    from public.notifications n
    join public.table_sessions ts on ts.id = n.table_session_id
    join public.tables t on t.id = ts.table_id
    where n.id = p_entity_id and n.status <> 'RESOLVED';
  end if;
  if target_branch_id is null then raise exception 'Waiter task is unavailable'; end if;
  if target_branch_id <> public.current_staff_branch_id()
    and not public.staff_has_permission('manage_all_branches') then
    raise exception 'Waiter task is unavailable';
  end if;

  select * into current_assignment
  from public.activity_logs
  where entity_type = p_entity_type
    and entity_id = p_entity_id
    and action in ('WAITER_ASSIGNED', 'WAITER_UNASSIGNED')
  order by id desc
  limit 1;
  assignment_found := found;

  select full_name into target_staff_name
  from public.staff
  where id = auth.uid() and active;

  if p_assigned then
    if assignment_found and current_assignment.action = 'WAITER_ASSIGNED' then
      if current_assignment.staff_id <> auth.uid() then
        raise exception 'Waiter task is already assigned';
      end if;
      return jsonb_build_object(
        'entityType', p_entity_type,
        'entityId', p_entity_id,
        'assigned', true,
        'assignedStaffId', auth.uid(),
        'assignedStaffName', target_staff_name,
        'assignedAt', current_assignment.created_at
      );
    end if;

    insert into public.activity_logs (
      restaurant_id, branch_id, staff_id, action, entity_type, entity_id, data
    )
    values (
      public.current_staff_restaurant_id(),
      target_branch_id,
      auth.uid(),
      'WAITER_ASSIGNED',
      p_entity_type,
      p_entity_id,
      jsonb_build_object(
        'assignedStaffId', auth.uid(),
        'assignedStaffName', target_staff_name,
        'tableSessionId', target_table_session_id,
        'tableId', target_table_id,
        'tableNumber', target_table_number
      )
    );
  else
    if not assignment_found or current_assignment.action <> 'WAITER_ASSIGNED' then
      raise exception 'Waiter task assignment not found';
    end if;
    if current_assignment.staff_id <> auth.uid()
      and staff_role not in ('OWNER', 'MANAGER') then
      raise exception 'Waiter task assignment not found';
    end if;

    insert into public.activity_logs (
      restaurant_id, branch_id, staff_id, action, entity_type, entity_id, data
    )
    values (
      public.current_staff_restaurant_id(),
      target_branch_id,
      auth.uid(),
      'WAITER_UNASSIGNED',
      p_entity_type,
      p_entity_id,
      jsonb_build_object(
        'previousStaffId', current_assignment.staff_id,
        'tableSessionId', target_table_session_id,
        'tableId', target_table_id,
        'tableNumber', target_table_number
      )
    );
  end if;

  return jsonb_build_object(
    'entityType', p_entity_type,
    'entityId', p_entity_id,
    'assigned', p_assigned,
    'assignedStaffId', case when p_assigned then auth.uid() else null end,
    'assignedStaffName', case when p_assigned then target_staff_name else null end,
    'assignedAt', case when p_assigned then v_now else null end
  );
end;
$$;

revoke execute on function public.current_staff_role()
  from public;
revoke execute on function public.update_service_request_status(uuid, public.request_status)
  from public, anon;
revoke execute on function public.set_waiter_task_assignment(text, uuid, boolean)
  from public, anon;
revoke execute on function public.log_waiter_order_event()
  from public, anon, authenticated;
revoke execute on function public.log_service_request_created()
  from public, anon, authenticated;
revoke execute on function public.log_service_request_response()
  from public, anon, authenticated;
grant execute on function public.current_staff_role()
  to authenticated;
grant execute on function public.update_service_request_status(uuid, public.request_status)
  to authenticated;
grant execute on function public.set_waiter_task_assignment(text, uuid, boolean)
  to authenticated;
