-- Create the first staff owner after adding the user in Supabase Authentication.
-- Replace the email below, then run this file once in the SQL editor.

insert into public.staff (
  id, restaurant_id, branch_id, role_id, full_name, active
)
select
  users.id,
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  coalesce(users.raw_user_meta_data ->> 'full_name', split_part(users.email, '@', 1)),
  true
from auth.users as users
where users.email = 'owner@replace-with-your-domain.com'
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  branch_id = excluded.branch_id,
  role_id = excluded.role_id,
  full_name = excluded.full_name,
  active = true;
