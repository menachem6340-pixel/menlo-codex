import Anthropic from "@anthropic-ai/sdk";
import {
  CONSTRUCTION_INTELLIGENCE_SYSTEM_PROMPT,
  buildSinglePlanTask,
  normalizeSkillResult,
} from "@/lib/ai/construction-intelligence-pro";

/**
 * שכבת AI לניתוח תכניות אדריכליות ישראליות
 * מבוסס על המתודולוגיה של skill "boq-mikveh"
 *
 * מזהה: סוג פרויקט (לפי צבעים), חדרים+מידות, פתחים, גבהים, ומציע סעיפי כתב כמויות
 */

const SYSTEM_PROMPT = `אתה מנהל פרויקטים בכיר ומהנדס ביצוע מוביל בתחום הבנייה וההנדסה האזרחית, עם ניסיון של מעל 30 שנה בפרויקטים מורכבים.
אתה מומחה ברמה הגבוהה ביותר בקריאת תכניות בנייה מכל הסוגים והפורמטים: PDF, DWG, DXF, IFC ותמונות סרוקות.
תפקידך לנתח תכנית בנייה (PDF/תמונה בשלב הנוכחי) ולהפיק פירוק הנדסי עמוק בעברית, כולל חישובים בפועל, רמת ודאות, והמלצה לכתב כמויות מקצועי.

אתה חושב כמו מהנדס ביצוע, מנהל פרויקט, חשב כמויות וארכיטקט מערכת תוכנה:
- אל תסתפק בזיהוי אלמנטים; חשב כמויות הנדסיות ככל שהמידע בתכנית מאפשר.
- הצלֵב מידות, קנ"מ, מקרא, קוטות וסימונים.
- כאשר חסר מידע, אל תמציא; ציין assumption, ambiguity או warning.
- כל פריט ב-boq_suggestions חייב לכלול calculation שמסביר איך הגעת לכמות.
- בכל סעיף ציין confidence כאשר אפשר: high / medium / low.

## קודם כל - זהה את סוג התכנית:

**אדריכלות** - מציג חדרים, רהיטים, חלונות, דלתות → השתמש במבנה rooms[]
**קונסטרוקציה (יסודות/ברזל/בטון)** - מציג עמודים, קורות, יסודות, ברזל → השתמש במבנה structural_elements[]
**חשמל** - מציג שקעים, מתגים, גופי תאורה → השתמש במבנה electrical_points
**אינסטלציה** - מציג צנרת, סניטריה → השתמש במבנה plumbing_points
**ניקוז** - מציג שיפועים, קווי ניקוז, קולטנים ותאי ביקורת
**מיזוג אוויר** - מציג תעלות, יחידות, דיפיוזרים, צנרת ניקוז מזגנים
**איטום** - מציג גגות, מרפסות, חדרים רטובים, מפלסים ופרטי איטום
**חתכים/חזיתות** - מציג מבטים → תאר את הקירות והגבהים

**אם זה תכנית קונסטרוקציה - אל תנסה למצוא חדרים!** במקום זה, חלץ:
- עמודים: כמות, מידות (לדוגמא 25×60 ס"מ), גובה
- קורות: כמות, חתך, אורך
- יסודות: סוג (רגל בודדה / רצועה / רפסודה), מידות, נפח בטון משוער
- כלונסאות: כמות, קוטר, עומק
- ברזל זיון: כמות משוערת בטון
- בטון: כמות משוערת במ"ק, סוג (B30/B35)

## שלב 1: זיהוי סוג הפרויקט - לפי צבעים בתכנית

| צבע בתכנית | משמעות |
|-----------|---------|
| אפור מלא / הצללה | קירות קיימים |
| צהוב מקווקו | הריסה / פירוק |
| אדום מלא | בנייה חדשה |
| כחול | אינסטלציה (מים/ביוב) |
| אדום + סמלים | חשמל |
| ירוק | בדוק במקרא |

**סוגי פרויקט:**
- **בנייה חדשה** - רק אדום + אפור (יסודות)
- **שיפוץ** - צהוב דומיננטי + אדום קטן
- **שיפוץ + מקווה** - שיפוץ + בור טבילה/אוצר זריעה

## שלב 2: זיהוי קנה מידה
חפש במסגרת התכנית (בדרך כלל בתחתית): 1:50 / 1:100 / 1:25
**כל חישוב ללא קנה מידה = שגוי. סמן warning אם לא ברור.**

## שלב 3: טבלת חדרים מדויקת
לכל חדר קרא את המידות מהתכנית:
- קוטות אופקיות בראש/תחתית התכנית (למידות אורך/רוחב)
- קוטות אנכיות בצדדים
- גובה תקרה מסומן עם H= (לדוגמא H=328 = 3.28 מ')
- אם מידה חסרה: סמן uncertain: true ותיאור הנחה

## שלב 4: פתחים (חלונות, דלתות)
חיוני - הפתחים מנוכים מחישובי טיח/חיפוי/בנייה.
לכל פתח: רוחב, גובה, סוג, כמות, מיקום

## שלב 5: סעיפי כתב כמויות מומלצים
מבוסס על מה שראית, הצע סעיפים ב-15 פרקים סטנדרטיים:
1. הריסה ופירוק (אם שיפוץ)
2. בנייה חדשה
3. טיח
4. איטום
5. ריצוף רצפות
6. חיפוי קירות
7. תקרות והנמכות
8. עבודות מיוחדות
9. בור טבילה (למקוואות בלבד)
10. חשמל
11. אינסטלציה
12. נגרות
13. שיש
14. צבע
15. נלוות וכלליות

## חישובים סטנדרטיים
- שטח רצפה = אורך × רוחב (מ"ר)
- היקף קירות = (אורך + רוחב) × 2
- שטח קירות = היקף × גובה
- שטח קירות נטו = שטח קירות − שטחי פתחים
- נפח בטון עמוד/קורה = רוחב × גובה/עובי × אורך × כמות
- נפח תקרה/רצפה = שטח × עובי
- משקל ברזל לפי קוטר = אורך כולל × משקל מטר תקני:
  8 מ"מ = 0.395 ק"ג/מ', 10 מ"מ = 0.617, 12 מ"מ = 0.888, 14 מ"מ = 1.21, 16 מ"מ = 1.58, 18 מ"מ = 2.00, 20 מ"מ = 2.47, 25 מ"מ = 3.85, 32 מ"מ = 6.31.
- אורכי צנרת/תעלות = סכום מקטעים לפי קנה מידה, ואם אין קנ"מ ברור ציין שזה אומדן.

## חישוב total_built_area_sqm - חשוב!
**total_built_area_sqm חייב להיות סכום של כל החדרים שב-rooms array.**
לא לחשב לפי קומה - אם יש מרתף + קומה ראשונה, גם המרתף נכלל.
חישוב פשוט: סכום כל area_sqm של החדרים = total_built_area_sqm

החזר JSON בלבד (ללא טקסט מסביב, ללא markdown), במבנה:
{
  "plan_type": "architecture | structure | electrical | plumbing | hvac | sections | site",
  "project_type": "new_construction | renovation | mikveh | other",
  "project_type_he": "בנייה חדשה / שיפוץ / מקווה",
  "scale": "1:50",
  "scale_confidence": "high | medium | low",
  "summary": "תיאור קצר בן 2-3 משפטים של מה רואים בתכנית",

  "structural_elements": {
    "columns": [{"location": "ציר A-1", "section_cm": "25×60", "height_m": 3.0, "count": 1}],
    "beams": [{"description": "קורה ראשית B1", "section_cm": "25×60", "length_m": 6, "count": 4}],
    "foundations": {"type": "רגל בודדה / רצועה / רפסודה", "concrete_volume_m3": 25, "rebar_tons": 2.5},
    "piles": [{"diameter_cm": 60, "depth_m": 8, "count": 12}],
    "concrete_total_m3": 35,
    "rebar_total_tons": 3.5,
    "concrete_grade": "B30"
  },
  "rebar_breakdown": [
    {"diameter_mm": 12, "total_length_m": 450, "kg_per_m": 0.888, "weight_kg": 399.6, "calculation": "450×0.888"}
  ],
  "systems": {
    "electrical": {"outlets_count": 0, "switches_count": 0, "ceiling_lights_count": 0, "notes": "..."},
    "plumbing": {"pipes_length_m": 0, "sinks": 0, "toilets": 0, "showers": 0, "notes": "..."},
    "drainage": {"pipes_length_m": 0, "inspection_chambers_count": 0, "drains_count": 0, "notes": "..."},
    "hvac": {"duct_length_m": 0, "diffusers_count": 0, "units_count": 0, "notes": "..."},
    "waterproofing": {"roof_area_sqm": 0, "wet_rooms_area_sqm": 0, "balconies_area_sqm": 0, "notes": "..."}
  },

  "rooms": [
    {
      "name": "סלון",
      "length_m": 4.54,
      "width_m": 2.69,
      "height_m": 3.28,
      "area_sqm": 12.21,
      "perimeter_m": 14.46,
      "wall_area_gross_sqm": 47.43,
      "floor_type": "פרקט / קרמיקה / שיש / לא מצוין",
      "wall_finish": "צבע / חיפוי קרמיקה / לא מצוין",
      "uncertain": false,
      "notes": "הערה אם רלוונטי"
    }
  ],

  "openings": {
    "doors": [
      {"type": "דלת פנים", "width_m": 0.80, "height_m": 2.10, "count": 4, "location": "חדרי רחצה"}
    ],
    "windows": [
      {"type": "חלון אלומיניום", "width_m": 1.20, "height_m": 1.40, "count": 6, "location": "חדרים"}
    ]
  },

  "totals": {
    "built_area_sqm": 145.5,
    "floors": 1,
    "rooms_count": 8,
    "doors_count": 8,
    "windows_count": 12,
    "wet_rooms_count": 3
  },

  "boq_suggestions": [
    {
      "chapter": "ריצוף רצפות",
      "items": [
        {
          "description": "ריצוף קרמיקה 60x60 - חדרי רחצה",
          "unit": "מ\\"ר",
          "quantity": 12.5,
          "calculation": "סך שטח 3 חדרי רחצה",
          "estimated_unit_price_ils": 250,
          "confidence": "medium"
        }
      ]
    }
  ],

  "ambiguities": [
    "סוג ריצוף לא צוין במקלחת ההורים",
    "גובה תקרה במסדרון לא ברור"
  ],

  "warnings": [
    "קנה מידה לא ברור - יש לאמת",
    "תכנית סרוקה באיכות נמוכה"
  ],

  "confidence_overall": "high | medium | low"
}

חשוב מאוד:
- **אל תמציא מידות!** אם משהו לא נראה בבירור - השאר ריק או סמן uncertain
- **שמות חדרים בעברית ובמלל מלא** (לא "Bedroom 1")
- **כל המידות במטרים** (לא בסנטימטרים) חוץ ממידות עמודים/קורות (סנטימטרים)
- **כל השטחים במ"ר** (לא במ"ק)
- **תכנית קונסטרוקציה** = מלא structural_elements, השאר rooms ריק (rooms: [])
- **תכנית חשמל/אינסטלציה** = תתמקד בנקודות וקווים, rooms ריק
- **תכנית אדריכלית** = תתמקד ב-rooms ופתחים, structural_elements ריק
- **תוודא שהשטחים מסתכמים נכון** - שטח הבנוי הכולל ≈ סכום שטחי החדרים
- **כתב כמויות** = חלוקה לענפים: שלד, גמרים, מערכות, פיתוח ותשתיות. כל סעיף עם יחידה, כמות, חישוב ורמת ודאות.`;

export interface PlanAnalysisResult {
  skill?: { name: string; version: string };
  plan_type?: "architecture" | "structure" | "electrical" | "plumbing" | "drainage" | "hvac" | "waterproofing" | "fire_safety" | "sections" | "site" | "details" | "other";
  project_type?: "new_construction" | "renovation" | "mikveh" | "commercial" | "residential" | "public" | "other";
  project_type_he?: string;
  revision?: string | null;
  scale?: string;
  scale_confidence?: "high" | "medium" | "low";
  summary?: string;
  structural_elements?: {
    columns?: Array<{ location?: string; section_cm?: string; height_m?: number; count?: number; concrete_volume_m3?: number; source_drawing?: string; confidence_score?: number }>;
    beams?: Array<{ description?: string; section_cm?: string; length_m?: number; count?: number; concrete_volume_m3?: number; source_drawing?: string; confidence_score?: number }>;
    foundations?: { type?: string; concrete_volume_m3?: number; rebar_tons?: number; source_drawing?: string; confidence_score?: number };
    piles?: Array<{ diameter_cm?: number; depth_m?: number; count?: number; source_drawing?: string; confidence_score?: number }>;
    concrete_total_m3?: number;
    rebar_total_tons?: number;
    concrete_grade?: string;
  };
  rebar_breakdown?: Array<{
    diameter_mm?: number;
    total_length_m?: number;
    kg_per_m?: number;
    weight_kg?: number;
    calculation?: string;
    source_drawing?: string;
    confidence_score?: number;
  }>;
  systems?: {
    electrical?: { outlets_count?: number; switches_count?: number; ceiling_lights_count?: number; notes?: string };
    plumbing?: { pipes_length_m?: number; sinks?: number; toilets?: number; showers?: number; notes?: string };
    drainage?: { pipes_length_m?: number; inspection_chambers_count?: number; drains_count?: number; notes?: string };
    hvac?: { duct_length_m?: number; diffusers_count?: number; units_count?: number; notes?: string };
    waterproofing?: { roof_area_sqm?: number; wet_rooms_area_sqm?: number; balconies_area_sqm?: number; notes?: string };
  };
  rooms: Array<{
    name: string;
    length_m?: number;
    width_m?: number;
    height_m?: number;
    area_sqm: number;
    perimeter_m?: number;
    wall_area_gross_sqm?: number;
    floor_type?: string;
    wall_finish?: string;
    uncertain?: boolean;
    notes?: string;
    source_drawing?: string;
    extraction_method?: string;
    confidence_score?: number;
    validation_status?: string;
  }>;
  openings?: {
    doors?: Array<{ type: string; width_m: number; height_m: number; count: number; location?: string; source_drawing?: string; confidence_score?: number }>;
    windows?: Array<{ type: string; width_m: number; height_m: number; count: number; location?: string; source_drawing?: string; confidence_score?: number }>;
  };
  totals?: {
    built_area_sqm?: number;
    architectural_area_sqm?: number;
    gross_area_sqm?: number;
    net_area_sqm?: number;
    floors?: number;
    rooms_count?: number;
    doors_count?: number;
    windows_count?: number;
    wet_rooms_count?: number;
  };
  boq_suggestions?: Array<{
    chapter: string;
    items: Array<{
      description: string;
      unit: string;
      quantity: number;
      calculation?: string;
      estimated_unit_price_ils?: number;
      confidence?: "high" | "medium" | "low";
      confidence_score?: number;
      extraction_method?: string;
      validation_status?: string;
      source_drawing?: string;
      drawing_number?: string;
      room_or_zone?: string;
      human_review_required?: boolean;
      warnings?: string[];
      notes?: string;
      client_price_ils?: number;
      contractor_price_ils?: number;
      subcontractor_price_ils?: number;
    }>;
  }>;
  quantity_summary?: Array<{
    quantity: string;
    unit: string;
    amount: number;
    source_drawing?: string;
    drawing_number?: string;
    room_or_zone?: string;
    extraction_method?: string;
    confidence_score?: number;
    validation_status?: string;
    calculation?: string;
    assumptions?: string[];
    human_review_required?: boolean;
  }>;
  validation_report?: {
    sanity_checks?: Array<{ name: string; status: "pass" | "warning" | "fail"; details?: string }>;
    cross_discipline_checks?: Array<{ name: string; status: "pass" | "warning" | "fail"; details?: string }>;
  };
  risk_analysis?: Array<{
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    description?: string;
    source_drawing?: string;
    recommendation?: string;
  }>;
  ai_recommendations?: Array<{
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    recommendation: string;
    commercial_impact?: string;
  }>;
  human_review?: {
    required?: boolean;
    questions?: string[];
    low_confidence_items?: string[];
  };
  ambiguities?: string[];
  warnings?: string[];
  confidence_overall?: "high" | "medium" | "low";

  // לגרסאות ישנות
  windows?: { count: number; total_area_sqm?: number; details?: string };
  doors?: { count: number; interior?: number; exterior?: number; details?: string };
  total_built_area_sqm?: number;
  floors?: number;
  notable_items?: string[];
}

export async function analyzePlanFromUrl(params: {
  fileUrl: string;
  fileType: "pdf" | "image";
  apiKey: string;
  planName?: string;
  planCategory?: string;
}): Promise<{
  result: PlanAnalysisResult;
  raw: unknown;
  cost_usd: number;
  model: string;
}> {
  const client = new Anthropic({ apiKey: params.apiKey });
  const model = "claude-sonnet-4-5-20250929";

  const fileResponse = await fetch(params.fileUrl);
  if (!fileResponse.ok) {
    throw new Error(`Failed to fetch file: ${fileResponse.status}`);
  }
  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  const base64 = buffer.toString("base64");

  const mediaType =
    params.fileType === "pdf" ? "application/pdf" : "image/jpeg";

  const message = await client.messages.create({
    model,
    max_tokens: 16384, // הגדל כדי שלא ייקטע
    system: `${CONSTRUCTION_INTELLIGENCE_SYSTEM_PROMPT}

Existing Menlo compatibility rules:
${SYSTEM_PROMPT}`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: params.fileType === "pdf" ? "document" : "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          } as never,
          {
            type: "text",
            text: buildSinglePlanTask({
              planName: params.planName,
              planCategory: params.planCategory,
            }),
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  const cleaned = textBlock.text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let result: PlanAnalysisResult;
  try {
    result = JSON.parse(cleaned) as PlanAnalysisResult;
  } catch {
    // ה-JSON נחתך באמצע - נסה לתקן ולחלץ מה שאפשר
    result = recoverTruncatedJson(cleaned);
  }
  result = normalizeSkillResult(result) as PlanAnalysisResult;

  // אכוף עקביות: השטח הכולל הוא תמיד סכום החדרים
  const roomsSum = (result.rooms || []).reduce((s, r) => s + (r.area_sqm || 0), 0);
  if (roomsSum > 0) {
    if (result.totals) {
      result.totals.built_area_sqm = roomsSum;
    } else {
      result.totals = {
        built_area_sqm: roomsSum,
        floors: 1,
        rooms_count: result.rooms?.length || 0,
        doors_count: 0,
        windows_count: 0,
      };
    }
    result.total_built_area_sqm = roomsSum;
  }

  // נרמל לתאימות לאחור
  if (result.totals) {
    result.total_built_area_sqm = result.totals.built_area_sqm || result.totals.architectural_area_sqm || result.total_built_area_sqm || 0;
    result.floors = result.totals.floors;
    result.windows = { count: result.totals.windows_count || result.windows?.count || 0 };
    result.doors = { count: result.totals.doors_count || result.doors?.count || 0 };
  }

  // Sonnet 4.5 prices: $3 input / $15 output per million tokens
  const inputCost = (message.usage.input_tokens / 1_000_000) * 3;
  const outputCost = (message.usage.output_tokens / 1_000_000) * 15;
  const cost_usd = inputCost + outputCost;

  return { result, raw: message, cost_usd, model };
}

/**
 * מנסה לחלץ JSON תקני גם אם הקריאה ל-AI נחתכה באמצע
 * סוגר אובייקטים ומערכים פתוחים, חותך בנקודה האחרונה התקנית
 */
function recoverTruncatedJson(text: string): PlanAnalysisResult {
  // מצא את האובייקט הבסיסי - rooms, totals, וכו'
  // נחתוך בסוף האובייקט/מערך השלם האחרון
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastValid = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"' && !escape) {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 1) lastValid = i + 1; // אובייקט/מערך שלם בתוך השורש
      if (depth === 0) lastValid = i + 1;
    }
  }

  if (lastValid === 0) {
    // לא הצלחנו לזהות מבנה - החזר רשומה ריקה
    return {
      rooms: [],
      summary: "הניתוח התקבל באופן חלקי - נסה שוב",
      warnings: ["JSON מהמודל לא תקין - בדוק את התכנית"],
    };
  }

  // קח עד נקודה תקנית, סגור את כל הסוגריים הפתוחים
  let truncated = text.slice(0, lastValid);

  // אם זה לא נגמר ב-} - הוסף סגירה
  if (!truncated.trim().endsWith("}")) {
    // חתוך לפסיק/סוגריים אחרון תקני
    const lastComma = truncated.lastIndexOf(",");
    const lastBrace = truncated.lastIndexOf("}");
    const lastBracket = truncated.lastIndexOf("]");
    const cutPoint = Math.max(lastBrace, lastBracket);
    if (cutPoint > lastComma) {
      truncated = truncated.slice(0, cutPoint + 1);
    }
    truncated += "}";
  }

  try {
    return JSON.parse(truncated) as PlanAnalysisResult;
  } catch {
    // last resort - החזר טקסטואלי
    return {
      rooms: [],
      summary: "הניתוח התקבל אבל לא ניתן היה לפענח את כל הפרטים",
      warnings: ["יש לנסות שוב - ה-AI החזיר נתונים לא שלמים"],
    };
  }
}
