create extension if not exists pgcrypto with schema extensions;

create table if not exists public.building_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default '',
  units numeric(10,2) not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.building_expense_months (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month integer not null check (month between 0 and 11),
  report_no text not null default '1',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(year, month)
);

create table if not exists public.building_expenses (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.building_expense_months(id) on delete cascade,
  name text not null default '',
  type text not null default 'عام' check (type in ('عام','خاص')),
  beneficiary_id uuid references public.building_beneficiaries(id) on delete set null,
  amount numeric(14,2) not null default 0,
  details text not null default '',
  note text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rent_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_no bigint not null unique,
  receipt_date date not null default current_date,
  po text not null default '',
  v_no text not null default '',
  tenant text not null,
  tenant_phone text not null default '',
  floor text not null default '',
  rent_year integer not null,
  from_month integer not null,
  to_month integer not null,
  annual_rent numeric(14,2) not null default 0,
  currency text not null default 'USD' check (currency in ('USD','IQD')),
  rate numeric(14,2) not null default 0,
  pay_method text not null default 'نقدًا',
  description text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create sequence if not exists public.rent_receipt_no_seq start 1001;
create sequence if not exists public.expense_receipt_no_seq start 1001;

alter sequence public.rent_receipt_no_seq owned by none;
alter sequence public.expense_receipt_no_seq owned by none;

create or replace function public.next_rent_receipt_no()
returns bigint language sql security definer set search_path=public as $$
  select nextval('public.rent_receipt_no_seq');
$$;

create or replace function public.next_expense_receipt_no()
returns bigint language sql security definer set search_path=public as $$
  select nextval('public.expense_receipt_no_seq');
$$;

alter table public.building_beneficiaries enable row level security;
alter table public.building_expense_months enable row level security;
alter table public.building_expenses enable row level security;
alter table public.rent_receipts enable row level security;

-- هذا الموقع داخلي ويستخدم publishable/anon key. الصلاحيات التالية تسمح بالقراءة والحفظ من الموقع.
drop policy if exists building_beneficiaries_all on public.building_beneficiaries;
create policy building_beneficiaries_all on public.building_beneficiaries for all to anon, authenticated using (true) with check (true);

drop policy if exists building_expense_months_all on public.building_expense_months;
create policy building_expense_months_all on public.building_expense_months for all to anon, authenticated using (true) with check (true);

drop policy if exists building_expenses_all on public.building_expenses;
create policy building_expenses_all on public.building_expenses for all to anon, authenticated using (true) with check (true);

drop policy if exists rent_receipts_all on public.rent_receipts;
create policy rent_receipts_all on public.rent_receipts for all to anon, authenticated using (true) with check (true);

grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on function public.next_rent_receipt_no() to anon, authenticated;
grant execute on function public.next_expense_receipt_no() to anon, authenticated;
grant select, insert, update, delete on public.building_beneficiaries to anon, authenticated;
grant select, insert, update, delete on public.building_expense_months to anon, authenticated;
grant select, insert, update, delete on public.building_expenses to anon, authenticated;
grant select, insert, update, delete on public.rent_receipts to anon, authenticated;

-- البيانات الافتراضية للمستأجرين المعروفين في بناية أمزون، ولا تُكرر إذا كانت موجودة.
insert into public.building_beneficiaries(name,unit,units)
select * from (values
 ('شركة شارع الأعمال (بزنز أفنيو)','الأول',1::numeric),
 ('شركة البطاقة الذكية (Q)','الثاني',1::numeric),
 ('نادي جالنجر الرياضي','الثالث',1::numeric)
) v(name,unit,units)
where not exists (select 1 from public.building_beneficiaries b where lower(trim(b.name))=lower(trim(v.name)));

-- تحديث PostgREST حتى تظهر الجداول الجديدة فورًا في API.
NOTIFY pgrst, 'reload schema';
