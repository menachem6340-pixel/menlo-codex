/**
 * תבניות משימות סטנדרטיות לפי שלבי ביצוע פרויקט בנייה
 * מבוסס על 15 פרקי boq + שלבי ביצוע סטנדרטיים בישראל
 */

export interface TaskTemplate {
  title: string;
  category: string;
  description?: string;
  estimated_days: number;
  checklist?: string[];
  depends_on?: string[]; // תיאור של תלויות (יבוצע על ידי מי שיוצר)
}

export interface TaskStage {
  name: string;
  emoji: string;
  tasks: TaskTemplate[];
}

export const PROJECT_STAGES: TaskStage[] = [
  {
    name: "התארגנות",
    emoji: "📋",
    tasks: [
      {
        title: "קבלת היתר בנייה",
        category: "ניירת",
        estimated_days: 30,
        checklist: ["הגשת בקשה לוועדה", "אישור תשריט", "תשלום אגרה", "קבלת היתר"],
      },
      {
        title: "הצבת גידור אתר",
        category: "התארגנות",
        estimated_days: 1,
        checklist: ["סימון גבולות", "התקנת לוחות גידור", "שילוט בטיחות"],
      },
      {
        title: "חיבור חשמל זמני לאתר",
        category: "חשמל",
        estimated_days: 3,
      },
      {
        title: "חיבור מים זמני לאתר",
        category: "אינסטלציה",
        estimated_days: 2,
      },
    ],
  },
  {
    name: "הריסה ופירוק",
    emoji: "🔨",
    tasks: [
      {
        title: "הריסת קירות פנימיים קיימים",
        category: "הריסה",
        estimated_days: 3,
        checklist: ["סימון קירות להריסה", "ניתוק חשמל ומים", "הריסה", "פינוי"],
      },
      {
        title: "פירוק ריצוף קיים",
        category: "הריסה",
        estimated_days: 2,
      },
      {
        title: "פינוי פסולת בנייה",
        category: "הריסה",
        estimated_days: 1,
      },
    ],
  },
  {
    name: "עפר ויסודות",
    emoji: "🏗️",
    tasks: [
      {
        title: "חפירה לפי תכנית יסודות",
        category: "עפר",
        estimated_days: 3,
        checklist: ["סימון לפי תכנית", "חפירה במכונה", "סידור גבהים"],
      },
      {
        title: "ברזל יסודות",
        category: "ברזל",
        estimated_days: 4,
        checklist: ["הזמנת ברזל לפי כתב כמויות", "חיתוך ועיצוב", "קשירת קונסטרוקציה", "בדיקת מהנדס"],
      },
      {
        title: "יציקת בטון יסודות",
        category: "בטון",
        estimated_days: 2,
        checklist: ["הזמנת בטון", "בדיקת קוביות", "יציקה", "הרטבה 3 ימים"],
      },
    ],
  },
  {
    name: "שלד",
    emoji: "🏛️",
    tasks: [
      {
        title: "ברזל ויציקת עמודים",
        category: "שלד",
        estimated_days: 5,
      },
      {
        title: "ברזל ויציקת קורות",
        category: "שלד",
        estimated_days: 4,
      },
      {
        title: "ברזל ויציקת תקרה",
        category: "שלד",
        estimated_days: 5,
      },
    ],
  },
  {
    name: "בנייה",
    emoji: "🧱",
    tasks: [
      {
        title: "בנייה בבלוקים - קירות חיצוניים",
        category: "בנייה",
        estimated_days: 7,
      },
      {
        title: "בנייה בבלוקים - מחיצות פנים",
        category: "בנייה",
        estimated_days: 5,
      },
    ],
  },
  {
    name: "מערכות גלויות",
    emoji: "🔌",
    tasks: [
      {
        title: "צנרת אינסטלציה - מים וביוב",
        category: "אינסטלציה",
        estimated_days: 5,
        checklist: ["פריסה לפי תכנית", "התקנת צנרת", "חיבורים", "בדיקת לחץ"],
      },
      {
        title: "פריסת חשמל - שרוולים וקופסאות",
        category: "חשמל",
        estimated_days: 5,
      },
      {
        title: "מערכת מיזוג - תעלות וצנרת",
        category: "מיזוג",
        estimated_days: 3,
      },
    ],
  },
  {
    name: "טיח",
    emoji: "🎨",
    tasks: [
      {
        title: "טיח חוץ",
        category: "טיח",
        estimated_days: 7,
      },
      {
        title: "טיח פנים",
        category: "טיח",
        estimated_days: 7,
      },
      {
        title: "טיח תקרה",
        category: "טיח",
        estimated_days: 3,
      },
    ],
  },
  {
    name: "איטום",
    emoji: "💧",
    tasks: [
      {
        title: "איטום חדרים רטובים",
        category: "איטום",
        estimated_days: 3,
        checklist: ["ניקוי השטח", "שכבת איטום ראשונה", "שכבת איטום שנייה", "בדיקת מים 24 שעות"],
      },
      {
        title: "איטום גג",
        category: "איטום",
        estimated_days: 2,
      },
    ],
  },
  {
    name: "ריצוף וחיפוי",
    emoji: "🟫",
    tasks: [
      {
        title: "ריצוף רצפות",
        category: "ריצוף",
        estimated_days: 7,
      },
      {
        title: "חיפוי קירות חדרי רחצה",
        category: "חיפוי",
        estimated_days: 5,
      },
      {
        title: "פלינטוס",
        category: "ריצוף",
        estimated_days: 2,
      },
    ],
  },
  {
    name: "תקרות",
    emoji: "🏠",
    tasks: [
      {
        title: "תקרות גבס מונמכות",
        category: "גבס",
        estimated_days: 5,
      },
      {
        title: "צביעת תקרות",
        category: "צבע",
        estimated_days: 2,
      },
    ],
  },
  {
    name: "מערכות סופיות",
    emoji: "💡",
    tasks: [
      {
        title: "התקנת כלים סניטריים",
        category: "אינסטלציה",
        estimated_days: 2,
      },
      {
        title: "התקנת גופי תאורה ושקעים",
        category: "חשמל",
        estimated_days: 2,
      },
      {
        title: "התקנת ברזים ומסננים",
        category: "אינסטלציה",
        estimated_days: 1,
      },
    ],
  },
  {
    name: "צביעה ונגרות",
    emoji: "🪟",
    tasks: [
      {
        title: "צבע פנים - שכבה ראשונה",
        category: "צבע",
        estimated_days: 5,
      },
      {
        title: "צבע פנים - שכבה שנייה וגמר",
        category: "צבע",
        estimated_days: 5,
      },
      {
        title: "התקנת דלתות פנים",
        category: "נגרות",
        estimated_days: 2,
      },
      {
        title: "התקנת ארונות מטבח",
        category: "נגרות",
        estimated_days: 3,
      },
    ],
  },
  {
    name: "סיום ומסירה",
    emoji: "✅",
    tasks: [
      {
        title: "ניקיון יסודי",
        category: "ניקיון",
        estimated_days: 2,
      },
      {
        title: "טופס 4 - אישור איכלוס",
        category: "ניירת",
        estimated_days: 14,
      },
      {
        title: "מסירה ללקוח",
        category: "מסירה",
        estimated_days: 1,
        checklist: [
          "סיור מסירה עם הלקוח",
          "רשימת ליקויים (פאנש)",
          "תיקון ליקויים",
          "חתימת מסירה סופית",
          "מסירת מפתחות",
        ],
      },
    ],
  },
];
