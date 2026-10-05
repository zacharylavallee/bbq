insert into public.menu_categories (id, name, sort_order)
values
  ('10000000-0000-4000-8000-000000000001', 'Meats', 1),
  ('10000000-0000-4000-8000-000000000002', 'Sandwiches', 2),
  ('10000000-0000-4000-8000-000000000003', 'Sides', 3),
  ('10000000-0000-4000-8000-000000000004', 'Desserts', 4),
  ('10000000-0000-4000-8000-000000000005', 'Catering Packages', 5);

insert into public.menu_items (
  id, category_id, name, description, price_cents, unit, image_path,
  is_available, is_catering, sort_order
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Brisket',
    'Slow-smoked for 14 hours over post oak.',
    2800,
    'lb',
    null,
    true,
    false,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Pulled Pork',
    'Hand-pulled shoulder with a vinegar mop.',
    1800,
    'lb',
    null,
    true,
    false,
    2
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Half Rack Ribs',
    'St. Louis spare ribs, dry-rubbed and glazed.',
    1900,
    'each',
    null,
    true,
    false,
    3
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'Smoked Chicken (half)',
    'Brined overnight, smoked until crisp-skinned.',
    1400,
    'each',
    null,
    true,
    false,
    4
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000002',
    'Brisket Sandwich',
    'Sliced brisket on a toasted brioche bun.',
    1300,
    'each',
    null,
    true,
    false,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000002',
    'Pulled Pork Sandwich',
    'Pulled pork piled high with slaw.',
    1100,
    'each',
    null,
    true,
    false,
    2
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000003',
    'Mac & Cheese',
    'Three cheeses, baked until golden.',
    500,
    'each',
    null,
    true,
    false,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000003',
    'Coleslaw',
    'Crunchy, tangy, made fresh daily.',
    400,
    'each',
    null,
    true,
    false,
    2
  ),
  (
    '20000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000003',
    'Baked Beans',
    'Simmered with burnt ends and molasses.',
    500,
    'each',
    null,
    true,
    false,
    3
  ),
  (
    '20000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000003',
    'Cornbread',
    'Skillet-baked with honey butter.',
    300,
    'each',
    null,
    true,
    false,
    4
  ),
  (
    '20000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000004',
    'Banana Pudding',
    'Classic pudding with vanilla wafers.',
    600,
    'each',
    null,
    false,
    false,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000005',
    'Pitmaster Package (feeds 10)',
    'Two meats, two sides, and cornbread for ten people.',
    18900,
    'tray',
    null,
    true,
    true,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000013',
    '10000000-0000-4000-8000-000000000005',
    'Party Pack Sides',
    'A tray of any three sides, feeds a crowd.',
    4500,
    'tray',
    null,
    true,
    true,
    2
  );

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '30000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'admin@bbq.local',
  extensions.crypt('admin-password', extensions.gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Local Admin"}',
  now(),
  now()
);

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
)
values (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '{"sub":"30000000-0000-4000-8000-000000000001","email":"admin@bbq.local","email_verified":true}',
  'email',
  '30000000-0000-4000-8000-000000000001',
  now(),
  now()
);

update public.profiles
set role = 'admin'
where id = '30000000-0000-4000-8000-000000000001';
