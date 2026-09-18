-- WhatsApp intake for Menlo Codex. Raw events are deduplicated and every
-- captured file keeps its source message id for traceability.

create table if not exists whatsapp_project_channels (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  chat_id text not null,
  chat_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(organization_id, chat_id)
);

create table if not exists whatsapp_capture_sessions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  chat_id text not null,
  sender_id text,
  task_group_id uuid references task_groups(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists project_media (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  area_id uuid references project_areas(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  file_url text not null,
  media_type text,
  caption text,
  source text not null default 'whatsapp',
  source_message_id text,
  captured_by text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(organization_id, source_message_id)
);

create table if not exists integration_events (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  external_event_id text not null,
  organization_id uuid references organizations(id) on delete cascade,
  status text not null default 'received' check (status in ('received','processed','ignored','failed')),
  error_message text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, external_event_id)
);

create index if not exists idx_whatsapp_channels_chat on whatsapp_project_channels(chat_id) where is_active;
create index if not exists idx_whatsapp_sessions_active on whatsapp_capture_sessions(chat_id, expires_at desc);
create index if not exists idx_project_media_project on project_media(project_id, captured_at desc);

alter table whatsapp_project_channels enable row level security;
alter table whatsapp_capture_sessions enable row level security;
alter table project_media enable row level security;
alter table integration_events enable row level security;

create policy "org manages whatsapp channels" on whatsapp_project_channels for all to authenticated
  using (organization_id = auth_org_id()) with check (organization_id = auth_org_id());
create policy "org manages capture sessions" on whatsapp_capture_sessions for all to authenticated
  using (organization_id = auth_org_id()) with check (organization_id = auth_org_id());
create policy "org manages project media" on project_media for all to authenticated
  using (organization_id = auth_org_id()) with check (organization_id = auth_org_id());
create policy "org reads integration events" on integration_events for select to authenticated
  using (organization_id = auth_org_id());

