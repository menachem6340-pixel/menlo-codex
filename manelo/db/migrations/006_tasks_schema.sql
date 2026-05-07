-- =====================================================================
-- שלב 2 - משימות, ציק-ליסט, שיוך לבעלי מקצוע, גאנט
-- =====================================================================

create type task_status as enum ('not_started', 'in_progress', 'blocked', 'completed', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'critical');

-- =====================================================================
-- TASKS - משימות בפרויקט
-- =====================================================================

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade, -- תת-משימה
  -- שיוך לבעל מקצוע
  assigned_to_contact_id uuid references contacts(id) on delete set null,
  -- פרטי המשימה
  title text not null,
  description text,
  category text, -- "הריסה", "בנייה", "טיח", "ריצוף" וכו' (15 פרקי boq)
  status task_status not null default 'not_started',
  priority task_priority not null default 'medium',
  is_critical boolean default false, -- נתיב קריטי
  -- זמנים (לגאנט)
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  estimated_duration_days int,
  -- התקדמות
  progress_pct int default 0, -- 0-100
  -- כמויות (לחיבור לכתב כמויות)
  unit text,
  quantity numeric(12,3),
  -- מיון
  display_order int default 0,
  -- פאבליק קישור
  public_token text unique, -- לשיתוף לבעל מקצוע ללא רישום
  -- מטא
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_status on tasks(project_id, status);
create index if not exists idx_tasks_assigned on tasks(assigned_to_contact_id);
create index if not exists idx_tasks_public_token on tasks(public_token) where public_token is not null;

-- =====================================================================
-- TASK_DEPENDENCIES - תלויות בין משימות (לנתיב קריטי)
-- =====================================================================

create table if not exists task_dependencies (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade, -- המשימה הזו
  depends_on_task_id uuid not null references tasks(id) on delete cascade, -- תלויה ב
  dependency_type text default 'finish_to_start', -- finish_to_start | start_to_start
  created_at timestamptz default now(),
  unique(task_id, depends_on_task_id)
);

create index if not exists idx_dependencies_task on task_dependencies(task_id);
create index if not exists idx_dependencies_depends on task_dependencies(depends_on_task_id);

-- =====================================================================
-- TASK_CHECKLIST_ITEMS - ציק-ליסט בתוך משימה
-- =====================================================================

create table if not exists task_checklist_items (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  description text not null,
  is_done boolean default false,
  display_order int default 0,
  done_by uuid references profiles(id),
  done_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_checklist_task on task_checklist_items(task_id);

-- =====================================================================
-- TASK_COMMENTS - תגובות והתקדמות
-- =====================================================================

create table if not exists task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_type text not null, -- 'user' | 'contact_via_link'
  author_user_id uuid references profiles(id),
  author_name text, -- אם מ-public link
  body text not null,
  attachments jsonb, -- [{url, type, name}]
  created_at timestamptz default now()
);

create index if not exists idx_comments_task on task_comments(task_id);

-- =====================================================================
-- RLS
-- =====================================================================

alter table tasks enable row level security;
alter table task_dependencies enable row level security;
alter table task_checklist_items enable row level security;
alter table task_comments enable row level security;

create policy "org manages tasks" on tasks
  for all using (organization_id = auth_org_id());

create policy "org manages dependencies" on task_dependencies
  for all using (
    exists (select 1 from tasks where tasks.id = task_dependencies.task_id and tasks.organization_id = auth_org_id())
  );

create policy "org manages checklist" on task_checklist_items
  for all using (
    exists (select 1 from tasks where tasks.id = task_checklist_items.task_id and tasks.organization_id = auth_org_id())
  );

create policy "org manages comments" on task_comments
  for all using (
    exists (select 1 from tasks where tasks.id = task_comments.task_id and tasks.organization_id = auth_org_id())
  );

-- =====================================================================
-- FUNCTION: יצירת public_token אוטומטית
-- =====================================================================

create or replace function generate_task_public_token()
returns trigger
language plpgsql
as $$
begin
  if new.public_token is null then
    new.public_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_task_public_token on tasks;
create trigger trg_task_public_token
  before insert on tasks
  for each row execute function generate_task_public_token();
