-- ===============================================================
-- Menlo Tasks Setup
-- להרצה ב-Supabase SQL Editor כשמופיעה שגיאה:
-- Could not find the table 'public.tasks' in the schema cache
-- ===============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

do $$
begin
  create type task_status as enum ('not_started', 'in_progress', 'blocked', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type task_priority as enum ('low', 'medium', 'high', 'critical');
exception
  when duplicate_object then null;
end $$;

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade,
  assigned_to_contact_id uuid references contacts(id) on delete set null,
  title text not null,
  description text,
  category text,
  status task_status not null default 'not_started',
  priority task_priority not null default 'medium',
  is_critical boolean default false,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  estimated_duration_days int,
  progress_pct int default 0,
  unit text,
  quantity numeric(12,3),
  display_order int default 0,
  public_token text unique,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists task_dependencies (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  dependency_type text default 'finish_to_start',
  created_at timestamptz default now(),
  unique(task_id, depends_on_task_id)
);

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

create table if not exists task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_type text not null,
  author_user_id uuid references profiles(id),
  author_name text,
  body text not null,
  attachments jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_status on tasks(project_id, status);
create index if not exists idx_tasks_assigned on tasks(assigned_to_contact_id);
create index if not exists idx_tasks_public_token on tasks(public_token) where public_token is not null;
create index if not exists idx_dependencies_task on task_dependencies(task_id);
create index if not exists idx_dependencies_depends on task_dependencies(depends_on_task_id);
create index if not exists idx_checklist_task on task_checklist_items(task_id);
create index if not exists idx_comments_task on task_comments(task_id);

alter table tasks enable row level security;
alter table task_dependencies enable row level security;
alter table task_checklist_items enable row level security;
alter table task_comments enable row level security;

drop policy if exists "org manages tasks" on tasks;
create policy "org manages tasks" on tasks
  for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());

drop policy if exists "org manages dependencies" on task_dependencies;
create policy "org manages dependencies" on task_dependencies
  for all using (
    exists (select 1 from tasks where tasks.id = task_dependencies.task_id and tasks.organization_id = auth_org_id())
  )
  with check (
    exists (select 1 from tasks where tasks.id = task_dependencies.task_id and tasks.organization_id = auth_org_id())
  );

drop policy if exists "org manages checklist" on task_checklist_items;
create policy "org manages checklist" on task_checklist_items
  for all using (
    exists (select 1 from tasks where tasks.id = task_checklist_items.task_id and tasks.organization_id = auth_org_id())
  )
  with check (
    exists (select 1 from tasks where tasks.id = task_checklist_items.task_id and tasks.organization_id = auth_org_id())
  );

drop policy if exists "org manages comments" on task_comments;
create policy "org manages comments" on task_comments
  for all using (
    exists (select 1 from tasks where tasks.id = task_comments.task_id and tasks.organization_id = auth_org_id())
  )
  with check (
    exists (select 1 from tasks where tasks.id = task_comments.task_id and tasks.organization_id = auth_org_id())
  );

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

-- Public task link functions.
-- These keep the task table protected while allowing a worker link to update only its own task.

create or replace function public_get_task(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'description', t.description,
    'status', t.status,
    'progress_pct', t.progress_pct,
    'planned_start', t.planned_start,
    'planned_end', t.planned_end,
    'project', jsonb_build_object('name', p.name, 'address', p.address),
    'assigned_to', case
      when c.id is null then null
      else jsonb_build_object('name', c.name, 'phone', c.phone)
    end,
    'organization', jsonb_build_object('name', o.name),
    'checklist', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ci.id,
            'description', ci.description,
            'is_done', ci.is_done,
            'display_order', ci.display_order
          )
          order by ci.display_order
        )
        from task_checklist_items ci
        where ci.task_id = t.id
      ),
      '[]'::jsonb
    )
  )
  from tasks t
  join projects p on p.id = t.project_id
  join organizations o on o.id = t.organization_id
  left join contacts c on c.id = t.assigned_to_contact_id
  where t.public_token = p_token
  limit 1;
$$;

create or replace function public_update_task(
  p_token text,
  p_status text default null,
  p_progress_pct int default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress int;
  v_status task_status;
begin
  if p_progress_pct is not null then
    v_progress := greatest(0, least(100, p_progress_pct));
  end if;

  if p_status in ('not_started', 'in_progress', 'blocked', 'completed', 'cancelled') then
    v_status := p_status::task_status;
  elsif v_progress = 100 then
    v_status := 'completed'::task_status;
  elsif v_progress > 0 then
    v_status := 'in_progress'::task_status;
  elsif v_progress = 0 then
    v_status := 'not_started'::task_status;
  end if;

  update tasks
  set
    status = coalesce(v_status, status),
    progress_pct = coalesce(v_progress, progress_pct),
    completed_at = case when coalesce(v_status, status) = 'completed' then now() else null end,
    updated_at = now()
  where public_token = p_token;

  return found;
end;
$$;

create or replace function public_update_task_checklist(
  p_token text,
  p_item_id uuid,
  p_is_done boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update task_checklist_items ci
  set
    is_done = p_is_done,
    done_at = case when p_is_done then now() else null end
  from tasks t
  where t.id = ci.task_id
    and t.public_token = p_token
    and ci.id = p_item_id;

  return found;
end;
$$;

create or replace function public_add_task_comment(
  p_token text,
  p_author_name text,
  p_body text,
  p_attachments jsonb default '[]'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_id uuid;
begin
  select id into v_task_id
  from tasks
  where public_token = p_token
  limit 1;

  if v_task_id is null or nullif(trim(p_body), '') is null then
    return false;
  end if;

  insert into task_comments(task_id, author_type, author_name, body, attachments)
  values (
    v_task_id,
    'contact_via_link',
    coalesce(nullif(trim(p_author_name), ''), 'גורם מטפל'),
    trim(p_body),
    coalesce(p_attachments, '[]'::jsonb)
  );

  return true;
end;
$$;

grant execute on function public_get_task(text) to anon, authenticated;
grant execute on function public_update_task(text, text, int) to anon, authenticated;
grant execute on function public_update_task_checklist(text, uuid, boolean) to anon, authenticated;
grant execute on function public_add_task_comment(text, text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
