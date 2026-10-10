-- ترقية مستقلة لإضافة قائمة المستأجرين للإيجارات فقط.
-- لا تعدّل جداول المصاريف أو بياناتها.
create table if not exists public.rent_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  floor text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.rent_tenants enable row level security;
drop policy if exists rent_tenants_all on public.rent_tenants;
create policy rent_tenants_all on public.rent_tenants
  for all to anon, authenticated using (true) with check (true);
