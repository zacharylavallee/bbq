create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  price_cents int not null check (price_cents >= 0),
  unit text not null default 'each' check (unit in ('each', 'lb', 'tray')),
  image_path text,
  is_available boolean not null default true,
  is_catering boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_category_id_idx on public.menu_items (category_id);

create trigger menu_categories_set_updated_at
before update on public.menu_categories
for each row
execute function public.set_updated_at();

create trigger menu_items_set_updated_at
before update on public.menu_items
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
revoke truncate on public.profiles, public.menu_categories, public.menu_items from anon, authenticated;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, phone) on public.profiles to authenticated;

create policy menu_categories_select
on public.menu_categories
for select
to anon, authenticated
using (true);

create policy menu_categories_insert_admin
on public.menu_categories
for insert
to authenticated
with check ((select public.is_admin()));

create policy menu_categories_update_admin
on public.menu_categories
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy menu_categories_delete_admin
on public.menu_categories
for delete
to authenticated
using ((select public.is_admin()));

create policy menu_items_select
on public.menu_items
for select
to anon, authenticated
using (true);

create policy menu_items_insert_admin
on public.menu_items
for insert
to authenticated
with check ((select public.is_admin()));

create policy menu_items_update_admin
on public.menu_items
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy menu_items_delete_admin
on public.menu_items
for delete
to authenticated
using ((select public.is_admin()));

grant select on public.menu_categories, public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_categories, public.menu_items to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'menu-photos',
  'menu-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy menu_photos_select
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'menu-photos');

create policy menu_photos_insert_admin
on storage.objects
for insert
to authenticated
with check (bucket_id = 'menu-photos' and (select public.is_admin()));

create policy menu_photos_update_admin
on storage.objects
for update
to authenticated
using (bucket_id = 'menu-photos' and (select public.is_admin()))
with check (bucket_id = 'menu-photos' and (select public.is_admin()));

create policy menu_photos_delete_admin
on storage.objects
for delete
to authenticated
using (bucket_id = 'menu-photos' and (select public.is_admin()));
