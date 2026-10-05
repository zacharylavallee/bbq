begin;

select plan(34);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.menu_categories'::regclass),
  'RLS is enabled on menu_categories'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.menu_items'::regclass),
  'RLS is enabled on menu_items'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'pgtap-admin@bbq.local',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"name":"PGTAP Admin"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'pgtap-customer@bbq.local',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"name":"PGTAP Customer"}',
    now(),
    now()
  );

update public.profiles
set role = 'admin'
where id = '90000000-0000-4000-8000-000000000001';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::int from public.menu_categories), 5, 'anon reads seeded categories');
select is((select count(*)::int from public.menu_items), 13, 'anon reads seeded items');
select throws_ok(
  $$insert into public.menu_categories (name) values ('Anon category')$$,
  '42501',
  null,
  'anon cannot insert categories'
);
select throws_ok(
  $$insert into public.menu_items (category_id, name, price_cents) values ('10000000-0000-4000-8000-000000000001', 'Anon item', 100)$$,
  '42501',
  null,
  'anon cannot insert items'
);
update public.menu_items
set is_available = true
where id = '20000000-0000-4000-8000-000000000011';
delete from public.menu_items where id = '20000000-0000-4000-8000-000000000001';
reset role;
select is(
  (select is_available from public.menu_items where id = '20000000-0000-4000-8000-000000000011'),
  false,
  'anon cannot update menu items'
);
select is(
  (select count(*)::int from public.menu_items where id = '20000000-0000-4000-8000-000000000001'),
  1,
  'anon cannot delete menu items'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select throws_ok(
  $$insert into public.menu_categories (name) values ('Customer category')$$,
  '42501',
  null,
  'customer cannot insert categories'
);
select throws_ok(
  $$insert into public.menu_items (category_id, name, price_cents) values ('10000000-0000-4000-8000-000000000001', 'Customer item', 100)$$,
  '42501',
  null,
  'customer cannot insert items'
);
update public.menu_items
set is_available = true
where id = '20000000-0000-4000-8000-000000000011';
delete from public.menu_items where id = '20000000-0000-4000-8000-000000000002';
reset role;
select is(
  (select is_available from public.menu_items where id = '20000000-0000-4000-8000-000000000011'),
  false,
  'customer cannot update menu items'
);
select is(
  (select count(*)::int from public.menu_items where id = '20000000-0000-4000-8000-000000000002'),
  1,
  'customer cannot delete menu items'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  $$insert into public.menu_categories (id, name, sort_order) values ('40000000-0000-4000-8000-000000000001', 'Test Category', 99)$$,
  'admin inserts category'
);
select lives_ok(
  $$insert into public.menu_items (id, category_id, name, price_cents) values ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Test Item', 100)$$,
  'admin inserts item'
);
select lives_ok(
  $$update public.menu_items set name = 'Updated Test Item' where id = '50000000-0000-4000-8000-000000000001'$$,
  'admin updates item'
);
select lives_ok(
  $$update public.menu_categories set name = 'Updated Test Category' where id = '40000000-0000-4000-8000-000000000001'$$,
  'admin updates category'
);
select lives_ok(
  $$delete from public.menu_items where id = '50000000-0000-4000-8000-000000000001'$$,
  'admin deletes item'
);
select lives_ok(
  $$delete from public.menu_categories where id = '40000000-0000-4000-8000-000000000001'$$,
  'admin deletes category'
);
select throws_ok(
  $$delete from public.menu_categories where id = '10000000-0000-4000-8000-000000000001'$$,
  '23503',
  null,
  'category with menu items cannot be deleted'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select is((select count(*)::int from public.profiles), 1, 'customer only sees own profile');
select lives_ok(
  $$update public.profiles set name = 'Updated Customer', phone = '555-0101' where id = '90000000-0000-4000-8000-000000000002'$$,
  'customer updates own profile fields'
);
select is(
  (select name from public.profiles where id = '90000000-0000-4000-8000-000000000002'),
  'Updated Customer',
  'customer reads updated own profile'
);
select is(
  (select count(*)::int from public.profiles where id = '90000000-0000-4000-8000-000000000001'),
  0,
  'customer cannot read another profile'
);
select throws_ok(
  $$update public.profiles set role = 'admin' where id = '90000000-0000-4000-8000-000000000002'$$,
  '42501',
  null,
  'customer cannot change profile role'
);
reset role;
select is(
  (select role from public.profiles where id = '90000000-0000-4000-8000-000000000002'),
  'customer',
  'customer role remains unchanged'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is((select count(*)::int from public.profiles), 3, 'admin reads all profiles');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('menu-photos', 'test/admin-upload.jpg')$$,
  'admin uploads menu photo'
);
reset role;
select set_config('storage.allow_delete_query', 'true', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('menu-photos', 'test/customer-upload.jpg')$$,
  '42501',
  null,
  'customer cannot upload menu photos'
);
update storage.objects
set name = 'test/customer-renamed.jpg'
where bucket_id = 'menu-photos' and name = 'test/admin-upload.jpg';
delete from storage.objects
where bucket_id = 'menu-photos' and name = 'test/admin-upload.jpg';
reset role;

select is(
  (select name from storage.objects where bucket_id = 'menu-photos' and name = 'test/admin-upload.jpg'),
  'test/admin-upload.jpg',
  'customer cannot update or delete admin menu photos'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('menu-photos', 'test/anon-upload.jpg')$$,
  '42501',
  null,
  'anon cannot upload menu photos'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'menu-photos'),
  1,
  'anon reads public menu photos'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  $$delete from storage.objects where bucket_id = 'menu-photos' and name = 'test/admin-upload.jpg'$$,
  'admin deletes menu photo'
);
reset role;
select is(
  (select count(*)::int from storage.objects where bucket_id = 'menu-photos'),
  0,
  'admin menu photo is deleted'
);

select * from finish();
rollback;
