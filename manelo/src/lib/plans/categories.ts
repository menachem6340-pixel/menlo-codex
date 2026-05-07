/**
 * קטגוריות תכניות - שם פנימי, תווית עברית, אייקון, צבע
 */

export type PlanCategory =
  | "architecture"
  | "structure"
  | "electrical"
  | "plumbing"
  | "drainage"
  | "hvac"
  | "waterproofing"
  | "fire_safety"
  | "sections"
  | "site"
  | "safety"
  | "finishing"
  | "other";

export const CATEGORIES: Record<PlanCategory, { label: string; emoji: string; color: string }> = {
  architecture: { label: "אדריכלות", emoji: "🏠", color: "bg-blue-100 text-blue-700 border-blue-300" },
  structure: { label: "קונסטרוקציה", emoji: "🏗️", color: "bg-stone-100 text-stone-700 border-stone-300" },
  electrical: { label: "חשמל", emoji: "⚡", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  plumbing: { label: "אינסטלציה", emoji: "🚰", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
  drainage: { label: "ניקוז וביוב", emoji: "↘️", color: "bg-teal-100 text-teal-700 border-teal-300" },
  hvac: { label: "מיזוג ואיורור", emoji: "❄️", color: "bg-sky-100 text-sky-700 border-sky-300" },
  waterproofing: { label: "איטום", emoji: "💧", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  fire_safety: { label: "כיבוי אש", emoji: "🔥", color: "bg-red-100 text-red-700 border-red-300" },
  sections: { label: "חתכים וחזיתות", emoji: "📐", color: "bg-purple-100 text-purple-700 border-purple-300" },
  site: { label: "פיתוח שטח", emoji: "🌳", color: "bg-green-100 text-green-700 border-green-300" },
  safety: { label: "בטיחות", emoji: "🦺", color: "bg-orange-100 text-orange-700 border-orange-300" },
  finishing: { label: "גמר ופנים", emoji: "🎨", color: "bg-pink-100 text-pink-700 border-pink-300" },
  other: { label: "אחר", emoji: "📄", color: "bg-neutral-100 text-neutral-700 border-neutral-300" },
};

/** מנסה לזהות קטגוריה משם קובץ עברי/אנגלי */
export function detectCategoryFromFilename(filename: string): PlanCategory {
  const name = filename.toLowerCase();

  // עברית
  if (/אדריכל|אדר['"]?\b|תכנית.?דיר|קומה|תכנית.?כללית|תוכנית.?אדר/.test(name)) return "architecture";
  if (/קונסטרוקצ|קונס['"]?\b|ברזל|בטון|יסודות|עמודים|קורות/.test(name)) return "structure";
  if (/חשמל|תאורה|שקעים|לוחות.חשמל/.test(name)) return "electrical";
  if (/ניקוז|דלוחין|ביוב|שופכין|קולטנים|תאי.?ביקורת/.test(name)) return "drainage";
  if (/אינסטלצי|אינסט|מים|סניטר/.test(name)) return "plumbing";
  if (/מיזוג|איורור|תרמ|אקלים|hvac/.test(name)) return "hvac";
  if (/איטום|יריעות|ביטומ|פוליאוריטן|רטוב|חדרים.?רטובים/.test(name)) return "waterproofing";
  if (/כיבוי|ספרינקל|מתז|אש|מילוט|גילוי.?אש/.test(name)) return "fire_safety";
  if (/חתכ|חתך|חזית|מבט/.test(name)) return "sections";
  if (/פיתוח|שטח|גינון|חצר|שביל|חניה/.test(name)) return "site";
  if (/בטיחות|מילוט|שילוט|כיבוי/.test(name)) return "safety";
  if (/גמר|פנים|ריצוף|חיפוי|צבע|נגר/.test(name)) return "finishing";

  // English
  if (/arch|architectur|floor.?plan|layout/.test(name)) return "architecture";
  if (/struct|rebar|concrete|foundation/.test(name)) return "structure";
  if (/electr|wiring|lighting/.test(name)) return "electrical";
  if (/drainage|sewer|storm/.test(name)) return "drainage";
  if (/plumb|water|sanitary/.test(name)) return "plumbing";
  if (/hvac|mechanical|cooling|ventil/.test(name)) return "hvac";
  if (/waterproof|membrane|bitumen|wet.?area/.test(name)) return "waterproofing";
  if (/fire|sprinkler|alarm|escape/.test(name)) return "fire_safety";
  if (/section|elevation|facade/.test(name)) return "sections";
  if (/site|landscap|garden/.test(name)) return "site";
  if (/safety|fire|emergency/.test(name)) return "safety";
  if (/finish|interior|floor|paint/.test(name)) return "finishing";

  return "other";
}
