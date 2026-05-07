-- =====================================================================
-- תיקון ה-trigger ליצירת משתמש חדש
-- בעיה: search_path + הרשאות
-- =====================================================================

-- 1. הסר את הטריגר והפונקציה הישנים
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- 2. צור פונקציה חדשה עם search_path מפורש והרשאות נכונות
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

  -- צור ארגון
  insert into public.organizations (name)
  values (user_business_name)
  returning id into new_org_id;

  -- צור פרופיל
  insert into public.profiles (id, organization_id, full_name, role)
  values (new.id, new_org_id, user_full_name, 'owner');

  return new;
exception
  when others then
    raise log 'handle_new_user error: %, sqlstate: %', sqlerrm, sqlstate;
    raise;
end;
$$;

-- 3. הענק הרשאות הרצה
grant execute on function public.handle_new_user() to anon, authenticated, service_role;

-- 4. הוסף את הטריגר מחדש
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 5. הוסף INSERT policies שחסרים
drop policy if exists "trigger inserts organizations" on organizations;
create policy "trigger inserts organizations" on organizations
  for insert
  with check (true);

drop policy if exists "users see profiles in their org" on profiles;
create policy "users see profiles in their org" on profiles
  for select using (
    organization_id = auth_org_id() or id = auth.uid()
  );
