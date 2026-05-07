-- =====================================================================
-- שלב 1 - תכניות, כתבי כמויות, הצעות מחיר
-- =====================================================================

-- =====================================================================
-- PLANS (תכניות שהועלו - PDF/תמונה)
-- =====================================================================

create table if not exists plans (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text, -- 'pdf', 'image', 'dwg'
  file_size_kb int,
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index if not exists idx_plans_project on plans(project_id);
create index if not exists idx_plans_org on plans(organization_id);

-- =====================================================================
-- PLAN ANALYSES (תוצאות ניתוח AI של תכנית)
-- =====================================================================

create table if not exists plan_analyses (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references plans(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  status text default 'pending', -- 'pending', 'processing', 'completed', 'failed'
  ai_model text, -- 'claude-sonnet-4.6' וכו'
  raw_response jsonb, -- תגובה מלאה מה-AI
  rooms jsonb, -- [{name, area_sqm, ...}]
  windows_count int,
  doors_count int,
  total_area_sqm numeric(10,2),
  notes text,
  error_message text,
  cost_usd numeric(8,4), -- עלות הקריאה ל-API
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_plan_analyses_plan on plan_analyses(plan_id);

-- =====================================================================
-- BILLS OF QUANTITIES (כתבי כמויות)
-- =====================================================================

create table if not exists boqs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  plan_analysis_id uuid references plan_analyses(id) on delete set null,
  name text not null,
  notes text,
  total_amount numeric(12,2) default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_boqs_project on boqs(project_id);

-- חלקים בכתב הכמויות (פרק 1: עבודות עפר, פרק 2: בטונים וכו')
create table if not exists boq_sections (
  id uuid primary key default uuid_generate_v4(),
  boq_id uuid not null references boqs(id) on delete cascade,
  name text not null,
  display_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_boq_sections_boq on boq_sections(boq_id);

-- שורות בכתב הכמויות
create table if not exists boq_items (
  id uuid primary key default uuid_generate_v4(),
  boq_id uuid not null references boqs(id) on delete cascade,
  section_id uuid references boq_sections(id) on delete cascade,
  price_item_id uuid references price_items(id) on delete set null,
  display_order int default 0,
  code text,
  description text not null,
  unit text not null, -- מ"ר, מ"א, יח'...
  quantity numeric(12,3) not null default 0,
  unit_price numeric(10,2) not null default 0,
  total_price numeric(12,2) generated always as (quantity * unit_price) stored,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_boq_items_boq on boq_items(boq_id);
create index if not exists idx_boq_items_section on boq_items(section_id);

-- =====================================================================
-- QUOTES (הצעות מחיר)
-- =====================================================================

create table if not exists quotes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  client_id uuid references contacts(id) on delete set null,
  boq_id uuid references boqs(id) on delete set null,
  quote_number text not null, -- לדוגמא: 2026-001
  title text not null,
  status quote_status not null default 'draft',
  issue_date date default current_date,
  valid_until date,
  subtotal numeric(12,2) default 0,
  discount_pct numeric(5,2) default 0,
  discount_amount numeric(12,2) default 0,
  vat_rate numeric(5,2) default 18.00,
  vat_amount numeric(12,2) default 0,
  total_amount numeric(12,2) default 0,
  payment_terms text, -- "30% מקדמה, 40% בשלד, 30% סיום"
  notes text, -- הערות / תנאים מיוחדים
  client_signature text, -- חתימה דיגיטלית
  signed_at timestamptz,
  pdf_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_quotes_org_status on quotes(organization_id, status);
create index if not exists idx_quotes_client on quotes(client_id);

-- שורות בהצעת מחיר (יכול להיות שונה מ-BOQ אחרי עריכה)
create table if not exists quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  display_order int default 0,
  description text not null,
  unit text not null,
  quantity numeric(12,3) not null default 0,
  unit_price numeric(10,2) not null default 0,
  total_price numeric(12,2) generated always as (quantity * unit_price) stored,
  notes text
);

create index if not exists idx_quote_items_quote on quote_items(quote_id);

-- =====================================================================
-- RLS לטבלאות החדשות
-- =====================================================================

alter table plans enable row level security;
alter table plan_analyses enable row level security;
alter table boqs enable row level security;
alter table boq_sections enable row level security;
alter table boq_items enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;

create policy "org manages plans" on plans
  for all using (organization_id = auth_org_id());

create policy "org manages plan_analyses" on plan_analyses
  for all using (organization_id = auth_org_id());

create policy "org manages boqs" on boqs
  for all using (organization_id = auth_org_id());

create policy "org manages boq_sections" on boq_sections
  for all using (
    exists (select 1 from boqs where boqs.id = boq_sections.boq_id and boqs.organization_id = auth_org_id())
  );

create policy "org manages boq_items" on boq_items
  for all using (
    exists (select 1 from boqs where boqs.id = boq_items.boq_id and boqs.organization_id = auth_org_id())
  );

create policy "org manages quotes" on quotes
  for all using (organization_id = auth_org_id());

create policy "org manages quote_items" on quote_items
  for all using (
    exists (select 1 from quotes where quotes.id = quote_items.quote_id and quotes.organization_id = auth_org_id())
  );

-- =====================================================================
-- SEQUENCE להפקת מספרי הצעות מחיר רצופים לכל ארגון
-- =====================================================================

create or replace function next_quote_number(org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  year_part text;
  count_part int;
begin
  year_part := to_char(current_date, 'YYYY');
  select coalesce(count(*), 0) + 1
  into count_part
  from quotes
  where organization_id = org_id
    and to_char(created_at, 'YYYY') = year_part;
  return year_part || '-' || lpad(count_part::text, 3, '0');
end;
$$;

grant execute on function next_quote_number(uuid) to authenticated;

-- =====================================================================
-- TRIGGER: עדכון אוטומטי של סכומי הצעת מחיר כשמשתנים פריטים
-- =====================================================================

create or replace function recalc_quote_totals()
returns trigger
language plpgsql
as $$
declare
  q_id uuid;
  new_subtotal numeric(12,2);
  q record;
begin
  q_id := coalesce(new.quote_id, old.quote_id);

  select coalesce(sum(total_price), 0) into new_subtotal
  from quote_items where quote_id = q_id;

  select discount_pct, discount_amount, vat_rate into q
  from quotes where id = q_id;

  update quotes set
    subtotal = new_subtotal,
    discount_amount = case
      when q.discount_pct > 0 then new_subtotal * q.discount_pct / 100
      else q.discount_amount
    end,
    vat_amount = (new_subtotal - case
      when q.discount_pct > 0 then new_subtotal * q.discount_pct / 100
      else q.discount_amount
    end) * q.vat_rate / 100,
    total_amount = (new_subtotal - case
      when q.discount_pct > 0 then new_subtotal * q.discount_pct / 100
      else q.discount_amount
    end) * (1 + q.vat_rate / 100),
    updated_at = now()
  where id = q_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recalc_quote_totals on quote_items;
create trigger trg_recalc_quote_totals
  after insert or update or delete on quote_items
  for each row execute function recalc_quote_totals();
