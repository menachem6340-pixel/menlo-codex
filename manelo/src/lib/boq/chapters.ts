/**
 * 15 פרקי כתב כמויות סטנדרטיים + פריטים מומלצים עם מחירי שוק 2026
 * מבוסס על המתודולוגיה של skill "boq-mikveh"
 */

export interface BoqItemTemplate {
  description: string;
  unit: string;
  customer_price: number; // ₪ - מחיר לקוח 2026
}

export interface BoqChapterTemplate {
  name: string;
  emoji: string;
  items: BoqItemTemplate[];
}

export const BOQ_CHAPTERS: BoqChapterTemplate[] = [
  {
    name: "1. הריסה ופירוק",
    emoji: "🔨",
    items: [
      { description: "הריסת קיר בלוק", unit: "מ\"ר", customer_price: 75 },
      { description: "הריסת קיר בטון", unit: "מ\"ר", customer_price: 120 },
      { description: "פירוק ריצוף קיים", unit: "מ\"ר", customer_price: 50 },
      { description: "פירוק חיפוי קרמיקה", unit: "מ\"ר", customer_price: 55 },
      { description: "פירוק תקרות והנמכות", unit: "מ\"ר", customer_price: 45 },
      { description: "פירוק דלת + מסגרת", unit: "יח'", customer_price: 180 },
      { description: "פירוק כלים סניטריים", unit: "פאושל", customer_price: 3500 },
      { description: "פירוק חשמל ואינסטלציה ישנה", unit: "פאושל", customer_price: 4000 },
      { description: "פינוי פסולת בנייה", unit: "מ\"ק", customer_price: 200 },
    ],
  },
  {
    name: "2. בנייה חדשה",
    emoji: "🧱",
    items: [
      { description: "בלוק 10 ס\"מ - מחיצות", unit: "מ\"ר", customer_price: 200 },
      { description: "בלוק 15 ס\"מ - קירות", unit: "מ\"ר", customer_price: 230 },
      { description: "בלוק 20 ס\"מ - קירות עבים", unit: "מ\"ר", customer_price: 260 },
      { description: "קיר גבס - אסכלה סמויה", unit: "מ\"ר", customer_price: 320 },
      { description: "קיר גבס דקורטיבי", unit: "מ\"ר", customer_price: 350 },
      { description: "מסגרת לפתח חדש", unit: "יח'", customer_price: 380 },
    ],
  },
  {
    name: "3. עבודות בטון וברזל",
    emoji: "🏗️",
    items: [
      { description: "בטון יסודות B30", unit: "מ\"ק", customer_price: 1100 },
      { description: "בטון תקרה ועמודים B35", unit: "מ\"ק", customer_price: 1250 },
      { description: "ברזל זיון", unit: "טון", customer_price: 6000 },
      { description: "תבניות (פלטפורם)", unit: "מ\"ר", customer_price: 130 },
      { description: "כלונסאות קדוחים", unit: "מ\"א", customer_price: 380 },
    ],
  },
  {
    name: "4. טיח",
    emoji: "🎨",
    items: [
      { description: "טיח פנים - מתחת לקרמיקה", unit: "מ\"ר", customer_price: 100 },
      { description: "טיח פנים - מתחת לצבע", unit: "מ\"ר", customer_price: 90 },
      { description: "טיח חוץ", unit: "מ\"ר", customer_price: 120 },
      { description: "טיח תקרה", unit: "מ\"ר", customer_price: 110 },
      { description: "שליכט צבעוני חוץ", unit: "מ\"ר", customer_price: 180 },
    ],
  },
  {
    name: "5. איטום",
    emoji: "💧",
    items: [
      { description: "איטום חדר רחצה - פוליאוריתן", unit: "מ\"ר", customer_price: 150 },
      { description: "איטום מקלחת - 2 שכבות", unit: "מ\"ר", customer_price: 220 },
      { description: "איטום בור טבילה (מקווה)", unit: "מ\"ר", customer_price: 320 },
      { description: "איטום גג", unit: "מ\"ר", customer_price: 180 },
      { description: "בדיקת לחץ מים 72 שעות", unit: "פאושל", customer_price: 1500 },
    ],
  },
  {
    name: "6. ריצוף רצפות",
    emoji: "🟫",
    items: [
      { description: "ריצוף קרמיקה 60×60 רגיל", unit: "מ\"ר", customer_price: 250 },
      { description: "ריצוף קרמיקה גדול-פורמט 80×80", unit: "מ\"ר", customer_price: 350 },
      { description: "ריצוף שיש 100×100", unit: "מ\"ר", customer_price: 550 },
      { description: "ריצוף פרקט", unit: "מ\"ר", customer_price: 320 },
      { description: "פלינטוס", unit: "מ\"א", customer_price: 60 },
    ],
  },
  {
    name: "7. חיפוי קירות",
    emoji: "🧱",
    items: [
      { description: "חיפוי קרמיקה - חדר רחצה", unit: "מ\"ר", customer_price: 280 },
      { description: "חיפוי אריח גדול-פורמט", unit: "מ\"ר", customer_price: 650 },
      { description: "פסיפס", unit: "מ\"ר", customer_price: 800 },
      { description: "חיפוי שיש", unit: "מ\"ר", customer_price: 650 },
    ],
  },
  {
    name: "8. תקרות והנמכות",
    emoji: "🏠",
    items: [
      { description: "תקרת גבס מונמכת", unit: "מ\"ר", customer_price: 220 },
      { description: "תקרת גבס מעוצבת עם מדרגות", unit: "מ\"ר", customer_price: 350 },
      { description: "תקרת אקוסטית", unit: "מ\"ר", customer_price: 280 },
    ],
  },
  {
    name: "9. חשמל",
    emoji: "⚡",
    items: [
      { description: "נקודת חשמל (שקע/מתג)", unit: "יח'", customer_price: 220 },
      { description: "נקודת תאורה (גוף + חיווט)", unit: "יח'", customer_price: 280 },
      { description: "נקודת תקשורת/אינטרנט", unit: "יח'", customer_price: 250 },
      { description: "לוח חשמל ראשי", unit: "יח'", customer_price: 4500 },
      { description: "לוח חשמל משני", unit: "יח'", customer_price: 2200 },
      { description: "מנורות LED שקועות", unit: "יח'", customer_price: 180 },
    ],
  },
  {
    name: "10. אינסטלציה",
    emoji: "🚰",
    items: [
      { description: "נקודת מים קר/חם", unit: "יח'", customer_price: 280 },
      { description: "נקודת ביוב", unit: "יח'", customer_price: 320 },
      { description: "אסלה תלויה (כולל מיכל)", unit: "יח'", customer_price: 1800 },
      { description: "אסלה רגילה", unit: "יח'", customer_price: 950 },
      { description: "כיור + ברז", unit: "יח'", customer_price: 1200 },
      { description: "מקלחון זכוכית", unit: "יח'", customer_price: 2800 },
      { description: "אמבטיה", unit: "יח'", customer_price: 2200 },
      { description: "דוד שמש", unit: "יח'", customer_price: 4500 },
    ],
  },
  {
    name: "11. נגרות",
    emoji: "🪟",
    items: [
      { description: "דלת פנים מעץ", unit: "יח'", customer_price: 1800 },
      { description: "דלת כניסה משוריינת", unit: "יח'", customer_price: 5500 },
      { description: "ארון מטבח לפי מ\"א", unit: "מ\"א", customer_price: 3500 },
      { description: "ארון אמבטיה", unit: "יח'", customer_price: 2800 },
      { description: "ארון קיר (לפי דוגמא)", unit: "מ\"ר", customer_price: 1800 },
    ],
  },
  {
    name: "12. שיש ומשטחים",
    emoji: "💎",
    items: [
      { description: "משטח שיש למטבח", unit: "מ\"א", customer_price: 1800 },
      { description: "משטח שיש לאמבטיה", unit: "יח'", customer_price: 2200 },
      { description: "אדן חלון משיש", unit: "מ\"א", customer_price: 350 },
    ],
  },
  {
    name: "13. צבע",
    emoji: "🎨",
    items: [
      { description: "צבע פנים אקרילי - 2 שכבות", unit: "מ\"ר", customer_price: 45 },
      { description: "צבע פנים בגוון - 2 שכבות", unit: "מ\"ר", customer_price: 55 },
      { description: "צבע חוץ", unit: "מ\"ר", customer_price: 80 },
      { description: "סיוד תקרה", unit: "מ\"ר", customer_price: 35 },
    ],
  },
  {
    name: "14. אלומיניום וזיגוג",
    emoji: "🪟",
    items: [
      { description: "חלון אלומיניום סטנדרטי", unit: "מ\"ר", customer_price: 1500 },
      { description: "חלון אלומיניום עם תריסים", unit: "מ\"ר", customer_price: 2200 },
      { description: "דלת אלומיניום + זכוכית", unit: "מ\"ר", customer_price: 2800 },
      { description: "מעקה אלומיניום למרפסת", unit: "מ\"א", customer_price: 850 },
    ],
  },
  {
    name: "15. נלוות וכלליות",
    emoji: "📋",
    items: [
      { description: "ניקיון יסודי בסוף עבודה", unit: "פאושל", customer_price: 2500 },
      { description: "פיגומים", unit: "פאושל", customer_price: 3500 },
      { description: "מכולה לפסולת", unit: "יח'", customer_price: 800 },
      { description: "ביטוח אתר", unit: "פאושל", customer_price: 2000 },
      { description: "פיקוח הנדסי", unit: "פאושל", customer_price: 5000 },
    ],
  },
];
