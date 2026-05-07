# Supabase נפרד לקודקס

המטרה: שקודקס ו-Claude לא יעבדו על אותו מסד נתונים.

## מה משתנה

- Claude נשאר מחובר ל-Supabase הישן שלו.
- Codex / התיקייה `manelo` יעברו ל-Supabase חדש.
- שינויי נתונים, טבלאות והרשאות בקודקס לא ישפיעו על Claude.

## שלבים

1. לפתוח Supabase.
2. ליצור פרויקט חדש בשם למשל:
   `menlo-codex`
3. להמתין שהפרויקט יסתיים להיבנות.
4. להיכנס ל-Project Settings / API או ל-Connect.
5. להעתיק:
   - Project URL
   - anon public key / publishable key
   - שים לב: אם Supabase מציג כתובת שמסתיימת ב-`/rest/v1/`, משתמשים רק בבסיס:
     `https://YOUR-PROJECT.supabase.co`
6. לפתוח את הקובץ:
   `.env.local`
7. להחליף רק את השורות:

```env
NEXT_PUBLIC_SUPABASE_URL=כתובת-הפרויקט-החדש
NEXT_PUBLIC_SUPABASE_ANON_KEY=המפתח-הציבורי-החדש
```

8. לא לשנות את Supabase של Claude.

## הקמת הטבלאות בפרויקט החדש

ב-Supabase החדש:

1. לפתוח SQL Editor.
2. להריץ את הקבצים לפי הסדר:

```text
db/migrations/001_initial_schema.sql
db/migrations/002_fix_trigger.sql
db/migrations/003_phase1_schema.sql
db/migrations/005_plan_categories.sql
db/manual_supabase_tasks_setup.sql
```

3. לפתוח Storage.
4. ליצור Bucket בשם:

```text
PLANS
```

5. להגדיר אותו Public.
6. לחזור ל-SQL Editor ולהריץ:

```text
db/migrations/004b_storage_policies_PLANS.sql
```

## אחרי ההקמה

1. להפעיל מחדש את השרת המקומי.
2. להירשם מחדש באפליקציה, כי המשתמשים ב-Supabase החדש ריקים.
3. ליצור לקוח/פרויקט בדיקה.
4. לבדוק:
   - שמירת משימה
   - שינוי סטטוס
   - העלאת תכנית
   - צירוף קובץ למשימה

## חשוב

לא להריץ את `001_initial_schema.sql` על Supabase הישן של Claude, כי הוא מוחק ובונה מחדש טבלאות בסיס.
להריץ אותו רק על הפרויקט החדש והריק של Codex.
