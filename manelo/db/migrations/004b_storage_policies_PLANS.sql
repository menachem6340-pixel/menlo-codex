-- =====================================================================
-- הרשאות Storage לבאקט 'PLANS' (אותיות גדולות - השם שיצרת)
-- =====================================================================

-- הסר פוליסיות ישנות (גם ל-plans וגם ל-PLANS)
drop policy if exists "authenticated users upload plans" on storage.objects;
drop policy if exists "users see plans" on storage.objects;
drop policy if exists "users update own plans" on storage.objects;
drop policy if exists "users delete own plans" on storage.objects;
drop policy if exists "authenticated users upload PLANS" on storage.objects;
drop policy if exists "users see PLANS" on storage.objects;
drop policy if exists "users update own PLANS" on storage.objects;
drop policy if exists "users delete own PLANS" on storage.objects;

-- העלאה
create policy "authenticated users upload PLANS"
on storage.objects for insert
to authenticated
with check (bucket_id = 'PLANS');

-- צפייה (public)
create policy "users see PLANS"
on storage.objects for select
to public
using (bucket_id = 'PLANS');

-- עדכון
create policy "users update own PLANS"
on storage.objects for update
to authenticated
using (bucket_id = 'PLANS' and owner = auth.uid());

-- מחיקה
create policy "users delete own PLANS"
on storage.objects for delete
to authenticated
using (bucket_id = 'PLANS' and owner = auth.uid());
