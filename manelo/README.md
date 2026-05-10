# מנלו קודקס

גרסת Codex הנפרדת של מערכת מנלו לקבלן בניין.

המטרה: אפליקציה אישית בעברית לניהול פרויקטים, תכניות, כתבי כמויות, הצעות מחיר, משימות, לקוחות, ספקים ו-Google Drive.

## כתובת ענן

https://menlo-codex.vercel.app

## תשתיות

- Next.js + React + Tailwind
- Supabase נפרד לגרסת Codex
- Google Drive לתיקיות וקבצים לפי פרויקט
- PWA להתקנה בטלפון
- Claude/Anthropic API לניתוח תכניות

## מסלולים חשובים

- `/dashboard` - מרכז עבודה
- `/dashboard/projects` - פרויקטים
- `/dashboard/plans` - תכניות
- `/dashboard/boq` - כתבי כמויות
- `/dashboard/quotes` - הצעות מחיר
- `/dashboard/tasks` - משימות
- `/dashboard/drive` - חיבור Google Drive
- `/api/health` - בדיקת הגדרות ענן בלי חשיפת סודות

## פריסה

ב-Vercel:

- Framework Preset: `Next.js`
- Root Directory: `manelo`
- Build Command: ברירת מחדל
- Output Directory: ריק
- Production domain: `menlo-codex.vercel.app`

משתני סביבה לדוגמה נמצאים ב-`.env.production.example`.

## כלל עבודה

זו גרסה ראשית נפרדת מגרסת Claude. לא מעתיקים קוד מ-Claude אוטומטית ולא משנים את הפרויקט המקורי.
