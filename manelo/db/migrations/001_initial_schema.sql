-- =====================================================================
-- מנלו בנייה - סכמת בסיס נתונים ראשונית (גרסה idempotent - אפשר להריץ שוב)
-- שלב 0 - תשתית: משתמשים, ארגון, לקוחות, ספקים, פרויקטים, מחירון
-- =====================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- =====================================================================
-- ניקוי קודם (אם רץ פעם קודמת חלקית)
-- =====================================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;
drop function if exists auth_org_id() cascade;

drop table if exists price_items cascade;
drop table if exists price_categories cascade;
drop table if exists projects cascade;
drop table if exists contacts cascade;
drop table if exists profiles cascade;
drop table if exists organizations cascade;

drop type if exists entity_type cascade;
drop type if exists quote_status cascade;
drop type if exists project_status cascade;
drop type if exists user_role cascade;

-- =====================================================================
-- ENUMS
-- =====================================================================

create type user_role as enum ('owner', 'office', 'field_worker', 'client');
create type project_status as enum ('lead', 'quoted', 'active', 'paused', 'completed', 'cancelled');
create type quote_status as enum ('draft', 'sent', 'approved', 'rejected', 'expired');
create type entity_type as enum ('client', 'supplier', 'professional');

-- =====================================================================
-- ORGANIZATIONS (חברה / קבלן יחיד)
-- =====================================================================

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  business_id text,
  address text,
  phone text,
  email text,
  logo_url text,
  brand_color text default '#F5C842',
  vat_rate numeric(5,2) default 18.00,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================================
-- PROFILES (משתמשים - מורחב מ-auth.users של Supabase)
-- =====================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  role user_role not null default 'owner',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_org on profiles(organization_id);

-- =====================================================================
-- CONTACTS (לקוחות, ספקים, בעלי מקצוע)
-- =====================================================================

create table contacts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type entity_type not null,
  name text not null,
  business_id text,
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  region text,
  profession text,
  rating numeric(2,1),
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_contacts_org_type on contacts(organization_id, type);
create index idx_contacts_region on contacts(region) where type = 'professional';

-- =====================================================================
-- PROJECTS
-- =====================================================================

create table projects (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references contacts(id) on delete set null,
  name text not null,
  address text,
  description text,
  status project_status not null default 'lead',
  start_date date,
  end_date date,
  budget numeric(12,2),
  actual_cost numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_projects_org_status on projects(organization_id, status);

-- =====================================================================
-- PRICE LIST
-- =====================================================================

create table price_categories (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  parent_id uuid references price_categories(id) on delete cascade,
  name text not null,
  display_order int default 0,
  created_at timestamptz default now()
);

create table price_items (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  category_id uuid references price_categories(id) on delete set null,
  code text,
  description text not null,
  unit text not null,
  source text default 'custom',
  base_price numeric(10,2),
  custom_price numeric(10,2),
  default_margin numeric(5,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_price_items_org on price_items(organization_id);
create index idx_price_items_category on price_items(category_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table projects enable row level security;
alter table price_categories enable row level security;
alter table price_items enable row level security;

create or replace function auth_org_id()
returns uuid
language sql stable
security definer
as $$
  select organization_id from profiles where id = auth.uid()
$$;

create policy "users see own organization" on organizations
  for select using (id = auth_org_id());
create policy "owner can update organization" on organizations
  for update using (
    id = auth_org_id() and
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "users see profiles in their org" on profiles
  for select using (organization_id = auth_org_id());
create policy "users update own profile" on profiles
  for update using (id = auth.uid());
create policy "users insert own profile" on profiles
  for insert with check (id = auth.uid());

create policy "org sees own contacts" on contacts
  for select using (organization_id = auth_org_id());
create policy "org manages own contacts" on contacts
  for all using (organization_id = auth_org_id());

create policy "org sees own projects" on projects
  for select using (organization_id = auth_org_id());
create policy "org manages own projects" on projects
  for all using (organization_id = auth_org_id());

create policy "org sees own price categories" on price_categories
  for select using (organization_id is null or organization_id = auth_org_id());
create policy "org manages own price categories" on price_categories
  for all using (organization_id = auth_org_id());

create policy "org sees own price items" on price_items
  for select using (organization_id is null or organization_id = auth_org_id());
create policy "org manages own price items" on price_items
  for all using (organization_id = auth_org_id());

-- =====================================================================
-- TRIGGER: יצירת ארגון + פרופיל אוטומטית
-- =====================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  new_org_id uuid;
  user_full_name text;
  user_business_name text;
begin
  user_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.email);
  user_business_name := coalesce(new.raw_user_meta_data->>'business_name', user_full_name);

  insert into organizations (name)
  values (user_business_name)
  returning id into new_org_id;

  insert into profiles (id, organization_id, full_name, role)
  values (new.id, new_org_id, user_full_name, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
