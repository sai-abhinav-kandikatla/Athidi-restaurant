-- Operational seed for Athidhi Family Restaurant.
-- All records use stable UUIDs so this file is safe to run more than once.

insert into public.restaurants (id, name, slug)
values (
  '10000000-0000-4000-8000-000000000001',
  'Athidhi Family Restaurant',
  'athidhi-family-restaurant'
)
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

insert into public.branches (
  id, restaurant_id, name, timezone, opens_at, closes_at, tax_rate
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Main Restaurant',
  'Asia/Kolkata',
  '11:00',
  '23:00',
  5
)
on conflict (id) do update set
  name = excluded.name,
  timezone = excluded.timezone,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  tax_rate = excluded.tax_rate;

insert into public.sections (id, branch_id, name, sort_order)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Main Dining',
  1
)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.tables (id, branch_id, section_id, number, capacity, qr_token)
select
  ('40000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '20000000-0000-4000-8000-000000000001'::uuid,
  '30000000-0000-4000-8000-000000000001'::uuid,
  n,
  case when n <= 4 then 2 else 4 end,
  gen_random_uuid()
from generate_series(1, 20) as n
on conflict (branch_id, number) do update set
  section_id = excluded.section_id,
  capacity = excluded.capacity;

insert into public.menu_categories (
  id, restaurant_id, name, slug, sort_order, active
)
values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Starters', 'starters', 1, true),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Biryani', 'biryani', 2, true),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Naans', 'naans', 3, true),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Curry', 'curry', 4, true),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Fried Rice', 'fried-rice', 5, true),
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Desserts', 'desserts', 6, true)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.menu_items (
  id, restaurant_id, category_id, name, description, price,
  is_veg, available, bestseller, image_url, sort_order
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    'Athidhi Chicken Dum Biryani',
    'Slow-cooked basmati rice, tender chicken and house-ground spices.',
    289, false, true, true,
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=85',
    1
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'Paneer Tikka',
    'Charred cottage cheese, peppers and a smoky yoghurt marinade.',
    249, true, true, true,
    'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=900&q=85',
    2
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'Chicken 65',
    'Crisp, fiery chicken tossed with curry leaves and green chilli.',
    259, false, true, true,
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85',
    3
  ),
  (
    '60000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'Gobi Manchurian',
    'Crisp cauliflower in a tangy Indo-Chinese glaze.',
    189, true, true, false,
    'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=85',
    4
  ),
  (
    '60000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    'Mutton Dum Biryani',
    'Fragrant basmati layered with succulent mutton and saffron.',
    349, false, true, false,
    'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=900&q=85',
    5
  ),
  (
    '60000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    'Veg Dum Biryani',
    'Seasonal vegetables and basmati rice sealed with aromatic spices.',
    219, true, true, false,
    'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=900&q=85',
    6
  ),
  (
    '60000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000003',
    'Butter Naan',
    'Soft tandoor-baked bread brushed with cultured butter.',
    59, true, true, false,
    'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=85',
    7
  ),
  (
    '60000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000004',
    'Paneer Butter Masala',
    'Paneer in a velvety tomato, cashew and butter gravy.',
    249, true, true, false,
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=85',
    8
  ),
  (
    '60000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000004',
    'Andhra Chicken Curry',
    'A robust regional curry finished with roasted chilli and spices.',
    289, false, true, false,
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=85',
    9
  ),
  (
    '60000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000005',
    'Veg Fried Rice',
    'Wok-tossed rice with garden vegetables and spring onion.',
    179, true, true, false,
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=85',
    10
  ),
  (
    '60000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000005',
    'Chicken Fried Rice',
    'Smoky wok rice with chicken, egg and crisp vegetables.',
    219, false, true, false,
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=85',
    11
  ),
  (
    '60000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000006',
    'Gulab Jamun',
    'Warm milk dumplings in cardamom and rose syrup.',
    99, true, true, false,
    'https://images.unsplash.com/photo-1666190094769-7c0b0f35e28d?auto=format&fit=crop&w=900&q=85',
    12
  )
on conflict (id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  is_veg = excluded.is_veg,
  bestseller = excluded.bestseller,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;

insert into public.roles (id, restaurant_id, name, permissions)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Owner',
    '{"manage_all_branches":true,"manage_staff":true,"manage_menu":true,"manage_tables":true,"manage_orders":true,"manage_payments":true,"view_analytics":true,"manage_settings":true}'::jsonb
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Manager',
    '{"manage_staff":false,"manage_menu":true,"manage_tables":true,"manage_orders":true,"manage_payments":true,"view_analytics":true,"manage_settings":true}'::jsonb
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Kitchen',
    '{"manage_menu":false,"manage_tables":false,"manage_orders":true,"manage_payments":false,"view_analytics":false,"manage_settings":false}'::jsonb
  ),
  (
    '70000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'Waiter',
    '{"manage_menu":false,"manage_tables":true,"manage_orders":true,"manage_payments":false,"view_analytics":false,"manage_settings":false}'::jsonb
  ),
  (
    '70000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'Cashier',
    '{"manage_menu":false,"manage_tables":true,"manage_orders":false,"manage_payments":true,"view_analytics":false,"manage_settings":false}'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  permissions = excluded.permissions;
