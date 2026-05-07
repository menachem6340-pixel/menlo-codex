-- =====================================================================
-- הרשאות Storage לבאקט 'plans'
-- מאפשר למשתמשים מחוברים להעלות, לראות ולמחוק קבצים שלהם
-- =====================================================================

-- מחק פוליסיות ישנות אם קיימות
drop policy if exists "authenticated users upload plans" on storage.objects;
drop policy if exists "users see plans" on storage.objects;
drop policy if exists "users update own plans" on storage.objects;
drop policy if exists "users delete own plans" on storage.objects;

-- העלאה - כל משתמש מחובר יכול להעלות לבאקט plans
create policy "authenticated users upload plans"
on storage.objects for insert
to authenticated
with check (bucket_id = 'plans');

-- צפייה - כל אחד יכול לראות (כי הבאקט public)
create policy "users see plans"
on storage.objects for select
to public
using (bucket_id = 'plans');

-- עדכון - משתמשים יכולים לעדכן קבצים שלהם
create policy "users update own plans"
on storage.objects for update
to authenticated
using (bucket_id = 'plans' and owner = auth.uid());

-- מחיקה - משתמשים יכולים למחוק קבצים שלהם
create policy "users delete own plans"
on storage.objects for delete
to authenticated
using (bucket_id = 'plans' and owner = auth.uid());
