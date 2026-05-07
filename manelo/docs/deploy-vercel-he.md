# העלאה לענן עם Vercel

המטרה: שהמערכת תעבוד גם כשהמחשב כבוי.

## מה צריך לפני

1. חשבון GitHub
2. חשבון Vercel
3. הפרויקט `manelo`
4. Supabase החדש של קודקס שכבר חיברנו

## שלב 1 - לפתוח מאגר GitHub חדש

1. להיכנס ל-GitHub
2. ללחוץ `New repository`
3. שם מומלץ:
   `menlo-codex`
4. לבחור `Private`
5. ללחוץ `Create repository`

## שלב 2 - להעלות את קבצי הפרויקט

העלה ל-GitHub את התוכן של התיקייה:

`C:\Users\menachem\Documents\Codex\אתר מנלו\manelo`

לא מעלים:

- `node_modules`
- `.next`
- `.env`
- `.env.local`

הקובץ `.gitignore` כבר מגדיר את זה.

## שלב 3 - לפתוח פרויקט ב-Vercel

1. להיכנס ל-Vercel
2. ללחוץ `Add New...`
3. לבחור `Project`
4. לבחור את המאגר `menlo-codex`
5. ללחוץ `Import`

Vercel מזהה Next.js אוטומטית, אז בדרך כלל לא צריך לשנות הגדרות Build.

## שלב 4 - להגדיר Environment Variables ב-Vercel

להוסיף בדיוק את המשתנים האלה:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_BASE_URL
ANTHROPIC_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_DRIVE_ROOT_FOLDER
```

### ערכים

`NEXT_PUBLIC_SUPABASE_URL`
הכתובת של Supabase החדש:

`https://ookrfexrpqctbijwsals.supabase.co`

`NEXT_PUBLIC_SUPABASE_ANON_KEY`
המפתח הציבורי ששלחת

`NEXT_PUBLIC_BASE_URL`
בהתחלה אפשר לשים זמנית:

`https://YOUR-VERCEL-DOMAIN.vercel.app`

אחרי הפריסה, אם Vercel נתן כתובת אחרת, מעדכנים לערך המדויק.

`GOOGLE_REDIRECT_URI`

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/google-drive/callback
```

שאר המשתנים:
לפי הערכים שכבר קיימים אצלך ב-`.env.local`

## שלב 5 - Deploy

1. ללחוץ `Deploy`
2. לחכות לסיום
3. לפתוח את הכתובת ש-Vercel נותן

## שלב 6 - לעדכן Google OAuth

ב-Google Cloud Console:

1. לפתוח את ה-OAuth client
2. להוסיף ל-Authorized redirect URIs:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/google-drive/callback
```

אם רוצים להשאיר גם את הלוקאלי, אפשר להשאיר גם:

```text
http://localhost:3001/api/google-drive/callback
```

## בדיקה אחרי העלייה

1. לפתוח את האתר מהטלפון
2. להתחבר
3. ליצור משימה
4. לשנות סטטוס
5. להעלות תכנית
6. לבדוק יצירת הצעת מחיר
