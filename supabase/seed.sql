-- Bootstrap restaurant structure. Replace sample dish rows with the restaurant's
-- exact menu list once the official item-and-price source is supplied.
with restaurant as (
  insert into public.restaurants (name, slug) values ('Athidhi Family Restaurant', 'athidhi-family-restaurant') returning id
), branch as (
  insert into public.branches (restaurant_id, name, opens_at, closes_at)
  select id, 'Main Restaurant', '11:00', '23:00' from restaurant returning id, restaurant_id
), dining as (
  insert into public.sections (branch_id, name, sort_order) select id, 'Main Dining', 1 from branch returning id, branch_id
)
insert into public.tables (branch_id, section_id, number, capacity)
select dining.branch_id, dining.id, n, case when n in (1, 2, 3, 4) then 2 else 4 end
from dining cross join generate_series(1, 20) n;

with r as (select id from public.restaurants where slug = 'athidhi-family-restaurant')
insert into public.menu_categories (restaurant_id, name, slug, sort_order)
select r.id, value.name, value.slug, value.sort_order from r cross join (values
  ('Starters','starters',1), ('Biryani','biryani',2), ('Naans','naans',3),
  ('Curry','curry',4), ('Fried Rice','fried-rice',5), ('Others','others',6)
) value(name, slug, sort_order);
