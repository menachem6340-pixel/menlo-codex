import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { detectCategoryFromFilename, type PlanCategory } from "@/lib/plans/categories";
import { getAnthropicKey } from "@/lib/env";

/**
 * חולץ שם וקטגוריה מתוך תכנית באמצעות AI vision
 * מסתכל על "כותרת התכנית" (title block) שבתכניות ישראליות נמצאת בצד ימין למטה
 */
const SYSTEM_PROMPT = `אתה מומחה ותיק לקריאת תכניות בנייה ישראליות.

תפקידך לזהות בתוך התכנית את "כותרת התכנית" - הקופסא הסטנדרטית שתמיד נמצאת בתכנית
ומכילה את המידע על התכנית. בתכניות ישראליות היא לרוב נמצאת ב**צד ימין למטה** של הדף,
ויש בה מסגרת מוגדרת.

הכותרת מכילה בדרך כלל:
- **שם התכנית/שם הפרויקט** - הטקסט הגדול ביותר
- **סוג התכנית** - "תכנית קומה", "תכנית גגות", "חתך A-A", "פריסת חשמל", "תכנית אינסטלציה" וכו'
- **שם המתכנן/האדריכל/המהנדס** + טלפון
- **שם החברה / משרד תכנון**
- **מספר תכנית / שרטוט** - לדוגמא A-01, K-03, E-12
- **קנה מידה** - 1:50, 1:100, 1:200
- **תאריך**
- **גיליון מספר X מתוך Y**

זיהוי קטגוריה - **תסתכל על הכותרת בתכנית קודם כל**, ואז על התוכן:

**עדיפות 1 - הכותרת בתכנית עצמה:**
- "תכנית יסודות" / "ביסוס" / "פרטי ברזל" / "כלונסאות" / "קורות" / "עמודים" / "תקרת ביטון" → **structure**
- "תכנית חשמל" / "פריסת חשמל" / "תכנית תאורה" / "לוחות חשמל" → **electrical**
- "תכנית אינסטלציה" / "צנרת" / "אספקת מים" / "ביוב" / "סניטריה" → **plumbing**
- "תכנית אדריכלית" / "תכנית קומה" / "העמדה" / "תכנית כללית" → **architecture**
- "מיזוג" / "אקלים" / "ונטילציה" → **hvac**
- "חתך" / "חזית" / "מבט" → **sections**
- "פיתוח שטח" / "גינון" / "כביש" / "חניות" → **site**
- "תכנית גמר" / "ריצופים" / "חיפויים" → **finishing**
- "תכנית בטיחות" / "כיבוי אש" / "מילוט" → **safety**

**עדיפות 2 - אם הכותרת לא ברורה, לפי התוכן:**
- מציג חדרים, רהיטים, דלתות, חלונות (ללא ברזל) → **architecture**
- מציג ברזל, יסודות, עמודים, קורות, פרטי קונסטרוקציה → **structure**
- מציג שקעים, מתגים, גופי תאורה (סמלים חשמליים) → **electrical**
- מציג צנרת מים, ביוב, סמלי סניטריה → **plumbing**
- אחרת → **other**

**חשוב מאוד:** אם בתכנית כתוב מפורשות "תכנית יסודות" או "תכנית ביסוס" - זה structure, לא משנה מה רואים בה!

החזר JSON בלבד (ללא טקסט מסביב, ללא markdown), במבנה הזה:
{
  "title": "השם המדויק כפי שמופיע בכותרת + סוג התכנית, לדוגמא: 'תכנית קומה ראשונה - וילה משפחת כהן'",
  "plan_number": "מספר התכנית/השרטוט - לדוגמא A-02",
  "designer": "שם המתכנן הראשי",
  "company": "שם המשרד/החברה",
  "scale": "1:50",
  "date": "DD/MM/YYYY אם מצוין",
  "category": "אחת מ: architecture | structure | electrical | plumbing | hvac | sections | site | safety | finishing | other",
  "category_reason": "במשפט אחד למה בחרתי בקטגוריה הזו",
  "confidence": "high | medium | low - כמה בטוח אתה בזיהוי",
  "what_i_see": "תיאור קצר של מה שאתה רואה בתכנית (מה הכי בולט בה)"
}

חשוב מאוד:
- אם הכותרת לא ברורה - אל תמציא! החזר confidence: "low" ותגיד למה
- title חייב להיות מספיק תיאורי שאדם יבין מה זה
- אל תחזיר את שם הקובץ כשם - חפש בתוך התכנית
- אם זה PDF עם כמה דפים - תסתכל על הדף הראשון`;

export async function POST(req: Request) {
  try {
    const { fileUrl, fileType, originalName } = (await req.json()) as {
      fileUrl: string;
      fileType: "pdf" | "image";
      originalName?: string;
    };

    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return NextResponse.json({
        title: originalName?.replace(/\.[^.]+$/, "") || "תכנית",
        category: detectCategoryFromFilename(originalName || ""),
        ai_used: false,
      });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // הורד את הקובץ
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error("לא ניתן להוריד את הקובץ מ-Storage");
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mediaType = fileType === "pdf" ? "application/pdf" : "image/jpeg";

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929", // Sonnet יותר חזק לזיהוי ראייה ופרטים
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: fileType === "pdf" ? "document" : "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            } as never,
            {
              type: "text",
              text: `התכנית הזו במצורף. שם הקובץ המקורי הוא: "${originalName || "לא ידוע"}".

אנא נתח את התכנית עצמה (לא את שם הקובץ!), מצא את כותרת התכנית בצד ימין למטה,
וחלץ את כל הפרטים. החזר JSON בלבד.`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI החזיר תגובה ריקה");
    }

    const cleaned = textBlock.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const result = JSON.parse(cleaned) as {
      title?: string;
      plan_number?: string;
      designer?: string;
      company?: string;
      scale?: string;
      date?: string;
      category?: PlanCategory;
      category_reason?: string;
      confidence?: "high" | "medium" | "low";
      what_i_see?: string;
    };

    // בנה שם מלא עם המס' תכנית אם יש
    let displayName = result.title?.trim() || "";

    // אם השם של ה-AI ריק או גנרי - חזור לשם הקובץ
    if (!displayName || displayName.length < 3 || /^(תכנית|plan|untitled)$/i.test(displayName)) {
      displayName = originalName?.replace(/\.[^.]+$/, "") || "תכנית ללא שם";
    }

    // הוסף מספר תכנית אם זה לא כבר בתוך השם
    if (result.plan_number && !displayName.includes(result.plan_number)) {
      displayName = `${result.plan_number} · ${displayName}`;
    }

    // חישוב עלות
    const inputCost = (message.usage.input_tokens / 1_000_000) * 3;
    const outputCost = (message.usage.output_tokens / 1_000_000) * 15;
    const cost_usd = inputCost + outputCost;

    return NextResponse.json({
      title: displayName,
      category: result.category || detectCategoryFromFilename(originalName || ""),
      ai_used: true,
      confidence: result.confidence,
      details: result,
      cost_usd,
    });
  } catch (e) {
    console.error("extract-title error:", e);
    return NextResponse.json(
      {
        title: undefined,
        category: undefined,
        ai_used: false,
        error: e instanceof Error ? e.message : "Unknown",
      },
      { status: 200 }
    );
  }
}

export const maxDuration = 60;
