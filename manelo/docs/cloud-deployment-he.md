# הפעלת מנלו בענן

המטרה: שהאפליקציה תעבוד מהטלפון גם כשהמחשב שלך כבוי.

## למה זה קורה עכשיו

כרגע האתר רץ מהמחשב שלך בכתובת מקומית כמו:

`http://10.0.0.143:3001`

אם המחשב כבוי, השרת המקומי לא קיים ולכן הטלפון לא יכול לפתוח את המערכת.

## הפתרון הנכון

להעלות את Menlo לשרת ענן:

1. Supabase נשאר מסד הנתונים והאחסון.
2. Vercel מריץ את האתר וה-API של Next.js.
3. בטלפון נכנסים לכתובת קבועה עם HTTPS.
4. אפשר להתקין למסך הבית כמו אפליקציה.

## שלבים פשוטים

1. לפתוח חשבון ב-GitHub.
2. להעלות את תיקיית `manelo` לריפוזיטורי פרטי.
3. לפתוח חשבון ב-Vercel.
4. ב-Vercel ללחוץ `Add New Project`.
5. לבחור את הריפוזיטורי של Menlo.
6. להוסיף Environment Variables:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_DRIVE_REDIRECT_URI`

7. ללחוץ Deploy.
8. להעתיק את כתובת האתר מ-Vercel.
9. ב-Google Cloud לעדכן Redirect URI לכתובת החדשה:

   `https://YOUR-VERCEL-DOMAIN.vercel.app/api/google-drive/callback`

10. בטלפון לפתוח את כתובת Vercel ולהוסיף למסך הבית.

## תיקון משימות ב-Supabase

אם מופיעה שגיאה:

`Could not find the table 'public.tasks' in the schema cache`

צריך לפתוח את Supabase:

1. Project
2. SQL Editor
3. New query
4. להדביק את התוכן של:

`db/manual_supabase_tasks_setup.sql`

5. ללחוץ Run.
6. לחכות כמה שניות ולרענן את Menlo.

אחרי זה שמירת משימה, סטטוס, אחוז ביצוע, צ׳ק-ליסט והערות יעבדו.
