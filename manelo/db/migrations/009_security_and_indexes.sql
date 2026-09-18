-- Menlo Codex - security hardening and indexes found by the Supabase advisors.

create or replace function public.auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

revoke all on function public.auth_org_id() from public, anon;
grant execute on function public.auth_org_id() to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
  user_full_name text;
  user_business_name text;
begin
  user_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.email,
    'משתמש חדש'
  );
  user_business_name := coalesce(
    new.raw_user_meta_data->>'business_name',
    user_full_name
  );

  insert into public.organizations (name)
  values (user_business_name)
  returning id into new_org_id;

  insert into public.profiles (id, organization_id, full_name, role)
  values (new.id, new_org_id, user_full_name, 'owner');

  return new;
exception
  when others then
    raise log 'handle_new_user error: %, sqlstate: %', sqlerrm, sqlstate;
    raise;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.next_quote_number(org_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  year_part text;
  count_part int;
begin
  if org_id is null or org_id <> public.auth_org_id() then
    raise exception 'organization access denied';
  end if;

  year_part := pg_catalog.to_char(current_date, 'YYYY');
  select coalesce(count(*), 0) + 1
  into count_part
  from public.quotes
  where organization_id = org_id
    and pg_catalog.to_char(created_at, 'YYYY') = year_part;

  return year_part || '-' || pg_catalog.lpad(count_part::text, 3, '0');
end;
$$;

revoke all on function public.next_quote_number(uuid) from public, anon;
grant execute on function public.next_quote_number(uuid) to authenticated;

create or replace function public.recalc_quote_totals()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  q_id uuid;
  new_subtotal numeric(12,2);
  q record;
begin
  q_id := coalesce(new.quote_id, old.quote_id);

  select coalesce(sum(total_price), 0) into new_subtotal
  from public.quote_items where quote_id = q_id;

  select discount_pct, discount_amount, vat_rate into q
  from public.quotes where id = q_id;

  update public.quotes set
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

create or replace function public.generate_task_public_token()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.public_token is null then
    new.public_token := pg_catalog.encode(extensions.gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

create index if not exists idx_project_areas_organization on public.project_areas(organization_id);
create index if not exists idx_task_groups_organization on public.task_groups(organization_id);
create index if not exists idx_project_specs_organization on public.project_specs(organization_id);
create index if not exists idx_project_specs_plan on public.project_specs(plan_id) where plan_id is not null;
create index if not exists idx_project_specs_architect on public.project_specs(architect_approved_by) where architect_approved_by is not null;
create index if not exists idx_project_specs_manager on public.project_specs(manager_approved_by) where manager_approved_by is not null;
create index if not exists idx_project_specs_creator on public.project_specs(created_by) where created_by is not null;
create index if not exists idx_task_activity_organization on public.task_activity(organization_id);
create index if not exists idx_task_activity_actor on public.task_activity(actor_user_id) where actor_user_id is not null;
create index if not exists idx_whatsapp_channels_project on public.whatsapp_project_channels(project_id);
create index if not exists idx_whatsapp_sessions_project on public.whatsapp_capture_sessions(project_id);
create index if not exists idx_whatsapp_sessions_group on public.whatsapp_capture_sessions(task_group_id) where task_group_id is not null;
create index if not exists idx_project_media_organization on public.project_media(organization_id);
create index if not exists idx_project_media_area on public.project_media(area_id) where area_id is not null;
create index if not exists idx_project_media_task on public.project_media(task_id) where task_id is not null;
create index if not exists idx_integration_events_organization on public.integration_events(organization_id) where organization_id is not null;

notify pgrst, 'reload schema';
