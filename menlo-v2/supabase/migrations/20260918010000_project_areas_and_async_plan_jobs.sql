-- Menlo V2: area portfolio + durable plan analysis queue.

create table if not exists public.project_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_area_id uuid references public.project_areas(id) on delete set null,
  name text not null,
  floor_label text,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists idx_project_areas_project
  on public.project_areas(project_id, display_order);
create index if not exists idx_project_areas_org
  on public.project_areas(organization_id);

alter table public.tasks
  add column if not exists area_id uuid references public.project_areas(id) on delete set null;

create index if not exists idx_tasks_area_id on public.tasks(area_id);

alter table public.project_areas enable row level security;

drop policy if exists "org manages project areas" on public.project_areas;
create policy "org manages project areas" on public.project_areas
  for all
  to authenticated
  using (organization_id = (select public.auth_org_id()))
  with check (
    organization_id = (select public.auth_org_id())
    and exists (
      select 1
      from public.projects
      where projects.id = project_areas.project_id
        and projects.organization_id = (select public.auth_org_id())
    )
  );

grant select, insert, update, delete on public.project_areas to authenticated;

create table if not exists public.plan_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  stage text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_plan_analysis_jobs_queue
  on public.plan_analysis_jobs(status, created_at);
create index if not exists idx_plan_analysis_jobs_project
  on public.plan_analysis_jobs(project_id, created_at desc);

alter table public.plan_analysis_jobs enable row level security;

drop policy if exists "org reads plan analysis jobs" on public.plan_analysis_jobs;
create policy "org reads plan analysis jobs" on public.plan_analysis_jobs
  for select
  to authenticated
  using (organization_id = (select public.auth_org_id()));

grant select on public.plan_analysis_jobs to authenticated;
grant all on public.plan_analysis_jobs to service_role;

comment on table public.project_areas is 'Physical room/area portfolio per construction project';
comment on column public.tasks.area_id is 'Optional physical project area assigned to the task';
