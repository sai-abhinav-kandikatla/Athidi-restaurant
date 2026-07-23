-- Run this once on an existing hosted Athidhi database created before the
-- versioned API was added. New installations already receive this function
-- from schema.sql.

alter table public.table_sessions
  add column if not exists session_token_hash text,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz not null default (now() + interval '12 hours');

create unique index if not exists table_sessions_session_token_hash_key
  on public.table_sessions (session_token_hash)
  where session_token_hash is not null;
create index if not exists sessions_token_open_idx
  on public.table_sessions (session_token_hash, expires_at)
  where closed_at is null;

create table if not exists public.api_rate_limits (
  key_hash text not null,
  scope text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, scope)
);
alter table public.api_rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key_hash text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.api_rate_limits%rowtype;
  current_time timestamptz := clock_timestamp();
  retry_after integer;
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'Service role required';
  end if;
  if p_key_hash is null or length(p_key_hash) <> 64
    or p_scope is null or length(p_scope) > 80
    or p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.api_rate_limits (
    key_hash, scope, window_started_at, request_count, updated_at
  ) values (
    p_key_hash, p_scope, current_time, 1, current_time
  )
  on conflict (key_hash, scope) do update set
    window_started_at = case
      when public.api_rate_limits.window_started_at <= current_time - make_interval(secs => p_window_seconds)
        then current_time
      else public.api_rate_limits.window_started_at
    end,
    request_count = case
      when public.api_rate_limits.window_started_at <= current_time - make_interval(secs => p_window_seconds)
        then 1
      else public.api_rate_limits.request_count + 1
    end,
    updated_at = current_time
  returning * into current_record;

  retry_after := greatest(
    1,
    ceil(extract(epoch from (
      current_record.window_started_at + make_interval(secs => p_window_seconds) - current_time
    )))::integer
  );
  return jsonb_build_object(
    'allowed', current_record.request_count <= p_limit,
    'remaining', greatest(0, p_limit - current_record.request_count),
    'retry_after_seconds', retry_after
  );
end;
$$;

revoke all on public.api_rate_limits from anon, authenticated;
revoke execute on function public.check_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;

create or replace function public.open_table_session_by_number(
  p_table_number integer,
  p_branch_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_qr_token uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;
  if p_table_number is null or p_table_number <= 0 then
    raise exception 'Table number is invalid';
  end if;

  select target_table.qr_token into target_qr_token
  from public.tables target_table
  join public.branches target_branch on target_branch.id = target_table.branch_id
  join public.restaurants target_restaurant on target_restaurant.id = target_branch.restaurant_id
  where target_table.number = p_table_number
    and target_restaurant.slug = 'athidhi-family-restaurant'
    and (p_branch_id is null or target_table.branch_id = p_branch_id)
  order by target_branch.created_at
  limit 1;

  if target_qr_token is null then raise exception 'Table number is invalid'; end if;
  return public.open_table_session(target_qr_token);
end;
$$;

revoke execute on function public.open_table_session(uuid) from public, anon, authenticated;
revoke execute on function public.open_table_session_by_number(integer, uuid) from public, anon, authenticated;

create or replace function public.place_table_order_core(
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
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one menu item is required';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Order is too large'; end if;
  if p_spice_level not in ('Mild', 'Medium', 'Spicy', 'Extra spicy') then
    raise exception 'Invalid spice level';
  end if;

  select * into target_session
  from public.table_sessions
  where id = p_table_session_id and closed_at is null and expires_at > now()
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
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if not exists (
    select 1 from public.table_sessions
    where id = p_table_session_id
      and auth_user_id = a…224 tokens truncated… > now()
  ) then raise exception 'Table session is invalid or closed'; end if;
  return public.place_table_order_core(
    p_table_session_id, p_items, p_notes, p_spice_level, p_is_parcel
  );
end;
$$;

create or replace function public.create_service_request_core(
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
  select * into target_session
  from public.table_sessions
  where id = p_table_session_id and closed_at is null and expires_at > now();
  if not found then raise exception 'Table session is invalid or closed'; end if;
  select * into target_table from public.tables where id = target_session.table_id;

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
      where table_session_id = target_session.id and status in ('SERVED', 'READY');
  end if;
  return result;
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
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if not exists (
    select 1 from public.table_sessions
    where id = p_table_session_id
      and auth_user_id = auth.uid()
      and closed_at is null
      and expires_at > now()
  ) then raise exception 'Table session is invalid or closed'; end if;
  return public.create_service_request_core(p_table_session_id, p_request_type);
end;
$$;

create or replace function public.create_service_request_for_session(
  p_table_session_id uuid,
  p_session_token_hash text,
  p_request_type public.request_type
)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'Service role required';
  end if;
  if not exists (
    select 1 from public.table_sessions
    where id = p_table_session_id
      and session_token_hash = p_session_token_hash
      and closed_at is null
      and expires_at > now()
  ) then raise exception 'Table session is invalid or closed'; end if;
  return public.create_service_request_core(p_table_session_id, p_request_type);
end;
$$;

revoke execute on function public.place_table_order_core(uuid, jsonb, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.create_service_request_core(uuid, public.request_type) from public, anon, authenticated;
revoke execute on function public.place_table_order_for_session(uuid, text, jsonb, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.create_service_request_for_session(uuid, text, public.request_type) from public, anon, authenticated;
revoke execute on function public.place_table_order(uuid, jsonb, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.create_service_request(uuid, public.request_type) from public, anon, authenticated;
grant execute on function public.place_table_order_for_session(uuid, text, jsonb, text, text, boolean) to service_role;
grant execute on function public.create_service_request_for_session(uuid, text, public.request_type) to service_role;

drop policy if exists "staff reads self" on public.staff;
create policy "staff reads self" on public.staff
for select using (
  id = auth.uid()
  or (
    restaurant_id = public.current_staff_restaurant_id()
    and (
      branch_id = public.current_staff_branch_id()
      or public.staff_has_permission('manage_all_branches')
    )
  )
);

drop policy if exists "owner manages staff" on public.staff;
create policy "owner manages staff" on public.staff
for all using (
  public.staff_has_permission('manage_staff')
  and restaurant_id = public.current_staff_restaurant_id()
  and (
    branch_id = public.current_staff_branch_id()
    or public.staff_has_permission('manage_all_branches')
  )
)
with check (
  restaurant_id = public.current_staff_restaurant_id()
  and (
    branch_id = public.current_staff_branch_id()
    or public.staff_has_permission('manage_all_branches')
  )
);

drop policy if exists "staff reads activity" on public.activity_logs;
create policy "staff reads activity" on public.activity_logs
for select using (
  restaurant_id = public.current_staff_restaurant_id()
  and public.staff_has_permission('view_analytics')
  and (
    branch_id = public.current_staff_branch_id()
    or public.staff_has_permission('manage_all_branches')
  )
);
