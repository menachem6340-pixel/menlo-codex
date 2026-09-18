-- Menlo Codex - project control center
-- Adds areas, task groups, approved specifications and an auditable field-update trail.

create table if not exists project_areas (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  code text,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, name)
);

create table if not exists task_groups (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  area_id uuid references project_areas(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  category text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'blocked', 'completed', 'archived')),
  target_date date,
  sequence_number int not null default 1,
  source text not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks add column if not exists area_id uuid references project_areas(id) on delete set null;
alter table tasks add column if not exists task_group_id uuid references task_groups(id) on delete set null;
alter table tasks add column if not exists location_label text;
alter table tasks add column if not exists intake_source text not null default 'app';
alter table tasks add column if not exists source_message_id text;
alter table tasks add column if not exists evidence_required boolean not null default false;
alter table tasks add column if not exists last_field_update_at timestamptz;

create table if not exists project_specs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  area_id uuid references project_areas(id) on delete set null,
  plan_id uuid references plans(id) on delete set null,
  spec_key text not null,
  label text not null,
  value text not null,
  unit text,
  status text not null default 'draft' check (status in ('draft', 'review', 'confirmed', 'superseded')),
  revision int not null default 1 check (revision > 0),
  source_page text,
  source_note text,
  confidence numeric(4,3) check (confidence between 0 and 1),
  architect_approved_by uuid references profiles(id) on delete set null,
  architect_approved_at timestamptz,
  manager_approved_by uuid references profiles(id) on delete set null,
  manager_approved_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, area_id, spec_key, revision),
  check (status <> 'confirmed' or (
    architect_approved_by is not null and architect_approved_at is not null and
    manager_approved_by is not null and manager_approved_at is not null and
    (plan_id is not null or nullif(trim(source_note), '') is not null)
  ))
);

create table if not exists task_activity (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  event_type text not null,
  actor_type text not null default 'user',
  actor_user_id uuid references profiles(id) on delete set null,
  actor_name text,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_areas_project on project_areas(project_id, sort_order);
create index if not exists idx_task_groups_project on task_groups(project_id, status);
create index if not exists idx_task_groups_area on task_groups(area_id);
create index if not exists idx_tasks_area on tasks(area_id);
create index if not exists idx_tasks_group on tasks(task_group_id);
create index if not exists idx_project_specs_lookup on project_specs(project_id, area_id, status);
create index if not exists idx_task_activity_task on task_activity(task_id, created_at desc);

alter table project_areas enable row level security;
alter table task_groups enable row level security;
alter table project_specs enable row level security;
alter table task_activity enable row level security;

create policy "org manages project areas" on project_areas for all to authenticated
  using (organization_id = auth_org_id()) with check (organization_id = auth_org_id());
create policy "org manages task groups" on task_groups for all to authenticated
  using (organization_id = auth_org_id()) with check (organization_id = auth_org_id());
create policy "org manages project specs" on project_specs for all to authenticated
  using (organization_id = auth_org_id()) with check (organization_id = auth_org_id());
create policy "org reads task activity" on task_activity for select to authenticated
  using (organization_id = auth_org_id());
create policy "org adds task activity" on task_activity for insert to authenticated
  with check (organization_id = auth_org_id());

-- Public task links are intentionally token-scoped. They expose one task only and
-- never trust organization, project or actor identifiers supplied by the caller.
create or replace function public_update_task(
  p_token text,
  p_status text default null,
  p_progress_pct int default null
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_task tasks%rowtype;
  v_status task_status;
  v_progress int;
begin
  if p_token is null or char_length(p_token) < 24 then return false; end if;
  if p_status is not null and p_status not in ('not_started','in_progress','blocked','completed') then
    raise exception 'invalid status';
  end if;
  v_status := case when p_status is null then null else p_status::task_status end;
  v_progress := case when p_progress_pct is null then null else greatest(0, least(100, p_progress_pct)) end;

  select * into v_task from tasks where public_token = p_token for update;
  if not found then return false; end if;

  update tasks set
    status = coalesce(v_status, status),
    progress_pct = coalesce(v_progress, progress_pct),
    actual_start = case when v_status = 'in_progress' and actual_start is null then current_date else actual_start end,
    actual_end = case when v_status = 'completed' then current_date when v_status is not null then null else actual_end end,
    completed_at = case when v_status = 'completed' then now() when v_status is not null then null else completed_at end,
    last_field_update_at = now(),
    updated_at = now()
  where id = v_task.id;

  insert into task_activity(organization_id, task_id, event_type, actor_type, previous_value, new_value)
  values (
    v_task.organization_id,
    v_task.id,
    'field_update',
    'public_link',
    jsonb_build_object('status', v_task.status, 'progress_pct', v_task.progress_pct),
    jsonb_build_object('status', coalesce(p_status, v_task.status::text), 'progress_pct', coalesce(v_progress, v_task.progress_pct))
  );
  return true;
end;
$$;

revoke all on function public_update_task(text, text, int) from public;
grant execute on function public_update_task(text, text, int) to anon, authenticated;

create or replace function public_get_task(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'description', t.description,
    'status', t.status,
    'progress_pct', t.progress_pct,
    'planned_start', t.planned_start,
    'planned_end', t.planned_end,
    'location_label', t.location_label,
    'evidence_required', t.evidence_required,
    'project', jsonb_build_object('name', p.name, 'address', p.address),
    'assigned_to', case when c.id is null then null else jsonb_build_object('name', c.name) end,
    'organization', jsonb_build_object('name', o.name),
    'checklist', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ci.id, 'description', ci.description, 'is_done', ci.is_done,
        'display_order', ci.display_order
      ) order by ci.display_order)
      from task_checklist_items ci where ci.task_id = t.id
    ), '[]'::jsonb)
  )
  from tasks t
  join projects p on p.id = t.project_id
  join organizations o on o.id = t.organization_id
  left join contacts c on c.id = t.assigned_to_contact_id
  where char_length(p_token) >= 24 and t.public_token = p_token
  limit 1;
$$;

create or replace function public_update_task_checklist(p_token text, p_item_id uuid, p_is_done boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_task tasks%rowtype;
begin
  if p_token is null or char_length(p_token) < 24 then return false; end if;
  select * into v_task from tasks where public_token = p_token;
  if not found then return false; end if;
  update task_checklist_items set is_done = p_is_done, done_at = case when p_is_done then now() else null end
  where id = p_item_id and task_id = v_task.id;
  if not found then return false; end if;
  insert into task_activity(organization_id, task_id, event_type, actor_type, new_value)
  values (v_task.organization_id, v_task.id, 'checklist_update', 'public_link', jsonb_build_object('item_id', p_item_id, 'is_done', p_is_done));
  return true;
end;
$$;

create or replace function public_add_task_comment(
  p_token text, p_author_name text, p_body text, p_attachments jsonb default '[]'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_task tasks%rowtype;
declare v_name text;
declare v_body text;
begin
  if p_token is null or char_length(p_token) < 24 then return false; end if;
  v_name := left(coalesce(nullif(trim(p_author_name), ''), 'גורם מטפל'), 120);
  v_body := left(coalesce(trim(p_body), ''), 2000);
  if v_body = '' then return false; end if;
  select * into v_task from tasks where public_token = p_token;
  if not found then return false; end if;
  insert into task_comments(task_id, author_type, author_name, body, attachments)
  values (v_task.id, 'contact_via_link', v_name, v_body,
    case when jsonb_typeof(p_attachments) = 'array' then p_attachments else '[]'::jsonb end);
  insert into task_activity(organization_id, task_id, event_type, actor_type, actor_name, new_value)
  values (v_task.organization_id, v_task.id, 'comment_added', 'public_link', v_name, jsonb_build_object('body', v_body));
  return true;
end;
$$;

revoke all on function public_get_task(text) from public;
revoke all on function public_update_task_checklist(text, uuid, boolean) from public;
revoke all on function public_add_task_comment(text, text, text, jsonb) from public;
grant execute on function public_get_task(text) to anon, authenticated;
grant execute on function public_update_task_checklist(text, uuid, boolean) to anon, authenticated;
grant execute on function public_add_task_comment(text, text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
