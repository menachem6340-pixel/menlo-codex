import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { analyzePlanFromUrl } from "@/lib/ai/plan-analysis";
import {
  CONSTRUCTION_INTELLIGENCE_SYSTEM_PROMPT,
  buildCombinedPlanTask,
  normalizeSkillResult,
} from "@/lib/ai/construction-intelligence-pro";
import { getAnthropicKey } from "@/lib/env";

const COMBINED_SYSTEM_PROMPT = `אתה מנהל פרויקטים בכיר ומהנדס ביצוע מוביל בתחום הבנייה וההנדסה האזרחית, עם ניסיון של מעל 30 שנה בפרויקטים מורכבים.
מצורפות לך כמה תכניות של אותו פרויקט: אדריכלות, קונסטרוקציה, חשמל, אינסטלציה, ניקוז, מיזוג, איטום, חתכים/חזיתות או כל יועץ אחר.
תפקידך לנתח את כולן יחד ולהפיק פירוק הנדסי מאוחד של הפרויקט, כולל חישובים בפועל והצעה לכתב כמויות מקצועי.

חשוב:
- הסתכל על כל התכניות יחד - כל אחת מספקת מידע אחר
- אם תכנית אחת מציגה חדרים, השנייה קונסטרוקציה והשלישית מערכות - מזג את המידע למודל אחד
- שטחים תמיד במ"ר, מידות במ'
- שמות חדרים בעברית
- אל תמציא נתונים. אם חסר מידע, החזר ambiguity / warning / assumption
- כל פריט ב-boq_suggestions חייב לכלול calculation שמסביר איך חושבה הכמות
- חישוב ברזל לפי משקל מטר תקני: 8=0.395, 10=0.617, 12=0.888, 14=1.21, 16=1.58, 18=2.00, 20=2.47, 25=3.85, 32=6.31 ק"ג/מ'
- חישוב בטון לפי נפח אלמנטים: אורך × רוחב × גובה/עובי × כמות

החזר תוצאה כ-JSON בלבד, ללא טקסט מסביב, במבנה:
{
  "rooms": [
    {
      "name": "סלון",
      "area_sqm": 25.4,
      "perimeter_m": 20.5,
      "floor_type": "פרקט / קרמיקה / לא מצוין",
      "uncertain": false
    }
  ],
  "windows": { "count": 12, "total_area_sqm": 18.5, "details": "..." },
  "doors": { "count": 8, "interior": 6, "exterior": 2, "details": "..." },
  "electrical": {
    "outlets_count": 45,
    "switches_count": 22,
    "ceiling_lights_count": 14,
    "details": "כולל קווים תת-קרקעיים..."
  },
  "plumbing": {
    "sinks": 4,
    "toilets": 3,
    "showers": 2,
    "bathtubs": 1,
    "details": "..."
  },
  "structural_elements": {
    "columns": [{"location": "ציר A-1", "section_cm": "25×60", "height_m": 3, "count": 1}],
    "beams": [{"description": "קורה B1", "section_cm": "25×60", "length_m": 6, "count": 4}],
    "foundations": {"type": "רגל בודדה / רצועה / רפסודה", "concrete_volume_m3": 25, "rebar_tons": 2.5},
    "piles": [{"diameter_cm": 60, "depth_m": 8, "count": 12}],
    "concrete_total_m3": 35,
    "rebar_total_tons": 3.5
  },
  "rebar_breakdown": [
    {"diameter_mm": 12, "total_length_m": 450, "kg_per_m": 0.888, "weight_kg": 399.6, "calculation": "450×0.888"}
  ],
  "systems": {
    "electrical": {"outlets_count": 45, "switches_count": 22, "ceiling_lights_count": 14, "notes": "..."},
    "plumbing": {"pipes_length_m": 80, "sinks": 4, "toilets": 3, "showers": 2, "notes": "..."},
    "drainage": {"pipes_length_m": 45, "inspection_chambers_count": 2, "drains_count": 5, "notes": "..."},
    "hvac": {"duct_length_m": 30, "diffusers_count": 8, "units_count": 2, "notes": "..."},
    "waterproofing": {"roof_area_sqm": 120, "wet_rooms_area_sqm": 18, "balconies_area_sqm": 12, "notes": "..."}
  },
  "total_built_area_sqm": 145.5,
  "floors": 1,
  "summary": "וילה פרטית בקומה אחת...",
  "notable_items": ["מרפסת 18 מ\"ר", "גג רעפים"],
  "ambiguities": ["סוג ריצוף לא צוין במקלחת"],
  "boq_suggestions": [
    {
      "chapter": "6. ריצוף רצפות",
      "items": [
        {"description": "ריצוף קרמיקה 60x60", "unit": "מ\"ר", "quantity": 95, "calculation": "לפי סכום שטחי החדרים", "estimated_unit_price_ils": 250, "confidence": "medium"},
        {"description": "צבע פנים אקרילי", "unit": "מ\"ר", "quantity": 320, "calculation": "לפי היקפי קירות וגובה", "estimated_unit_price_ils": 45, "confidence": "medium"}
      ]
    }
  ]
}

boq_suggestions = הצעה לכתב כמויות מבוסס על מה שראית בתכניות.
השתמש בשמות הפרקים הסטנדרטיים: "1. הריסה ופירוק", "2. בנייה חדשה", "3. עבודות בטון וברזל", "4. טיח", "5. איטום", "6. ריצוף רצפות", "7. חיפוי קירות", "8. תקרות והנמכות", "9. חשמל", "10. אינסטלציה", "11. נגרות", "12. שיש ומשטחים", "13. צבע", "14. אלומיניום וזיגוג", "15. נלוות וכלליות".
אל תכניס סעיף אם אין בסיס בתכנית או אם הכמות היא ניחוש מוחלט; במקרה של הערכה סמן זאת ב-calculation.`;

export async function POST(req: Request) {
  try {
    const { planIds, combined } = (await req.json()) as {
      planIds: string[];
      combined: boolean;
    };

    if (!planIds || planIds.length === 0) {
      return NextResponse.json({ error: "אין תכניות לניתוח" }, { status: 400 });
    }

    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "מפתח ה-AI לא מוגדר. הוסף ANTHROPIC_API_KEY ל-.env.local והפעל מחדש את השרת." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: plans } = await supabase
      .from("plans")
      .select("*")
      .in("id", planIds);

    if (!plans || plans.length === 0) {
      return NextResponse.json({ error: "תכניות לא נמצאו" }, { status: 404 });
    }

    if (combined && plans.length > 1) {
      // ניתוח משולב - שולחים את כל התכניות יחד ל-AI
      return await runCombinedAnalysis(plans, apiKey, supabase);
    } else {
      // ניתוח נפרד לכל תכנית - במקביל (3 בו-זמנית) כדי לחסוך זמן
      const concurrency = 3;
      const results: Array<{ planId: string; success: boolean; error?: string }> = [];
      const queue = [...plans];
      const inProgress = new Set<Promise<void>>();

      const processOne = async (plan: typeof plans[0]) => {
        try {
          await runSingleAnalysis(plan, apiKey, supabase);
          results.push({ planId: plan.id, success: true });
        } catch (e) {
          results.push({
            planId: plan.id,
            success: false,
            error: e instanceof Error ? e.message : "Unknown",
          });
        }
      };

      while (queue.length > 0 || inProgress.size > 0) {
        while (inProgress.size < concurrency && queue.length > 0) {
          const plan = queue.shift()!;
          const p = processOne(plan).finally(() => inProgress.delete(p));
          inProgress.add(p);
        }
        if (inProgress.size > 0) await Promise.race(inProgress);
      }

      return NextResponse.json({ success: true, results });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function runSingleAnalysis(
  plan: { id: string; organization_id: string; file_url: string; file_type: string; name?: string; category?: string },
  apiKey: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  // מחק ניתוחים ישנים - שומרים רק את העדכני ביותר
  await supabase.from("plan_analyses").delete().eq("plan_id", plan.id);

  const { data: analysis } = await supabase
    .from("plan_analyses")
    .insert({
      plan_id: plan.id,
      organization_id: plan.organization_id,
      status: "processing",
    })
    .select("id")
    .single();

  if (!analysis) throw new Error("Failed to create analysis row");

  try {
    const fileType = (plan.file_type === "pdf" ? "pdf" : "image") as "pdf" | "image";
    const { result, raw, cost_usd, model } = await analyzePlanFromUrl({
      fileUrl: plan.file_url,
      fileType,
      apiKey,
      planName: plan.name,
      planCategory: plan.category,
    });

    const totalArea =
      result.total_built_area_sqm ||
      result.rooms.reduce((s, r) => s + (r.area_sqm || 0), 0);

    await supabase
      .from("plan_analyses")
      .update({
        status: "completed",
        ai_model: model,
        raw_response: raw as object,
        rooms: result.rooms,
        windows_count: result.windows?.count ?? 0,
        doors_count: result.doors?.count ?? 0,
        total_area_sqm: totalArea,
        notes: result.summary,
        cost_usd,
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysis.id);
  } catch (e) {
    await supabase
      .from("plan_analyses")
      .update({
        status: "failed",
        error_message: e instanceof Error ? e.message : "Unknown",
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysis.id);
    throw e;
  }
}

async function runCombinedAnalysis(
  plans: Array<{ id: string; organization_id: string; file_url: string; file_type: string; name: string }>,
  apiKey: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  // מחק ניתוחים ישנים לכל התכניות שמנותחות עכשיו
  await Promise.all(
    plans.map((p) => supabase.from("plan_analyses").delete().eq("plan_id", p.id))
  );

  // צור רשומה לכל תכנית במצב 'processing'
  const analysisRows = await Promise.all(
    plans.map((p) =>
      supabase
        .from("plan_analyses")
        .insert({
          plan_id: p.id,
          organization_id: p.organization_id,
          status: "processing",
        })
        .select("id")
        .single()
    )
  );

  try {
    const client = new Anthropic({ apiKey });

    // הורד את כל הקבצים והכן ב-base64
    const contentBlocks: Anthropic.ContentBlockParam[] = [];

    for (const plan of plans) {
      const res = await fetch(plan.file_url);
      if (!res.ok) throw new Error(`Failed to fetch ${plan.name}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mediaType = plan.file_type === "pdf" ? "application/pdf" : "image/jpeg";

      contentBlocks.push({
        type: "text",
        text: `=== תכנית: ${plan.name} ===`,
      });
      contentBlocks.push({
        type: plan.file_type === "pdf" ? "document" : "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64,
        },
      } as never);
    }

    contentBlocks.push({
      type: "text",
      text: buildCombinedPlanTask(plans.map((plan) => plan.name)),
    });

    const model = "claude-sonnet-4-5-20250929";
    const message = await client.messages.create({
      model,
      max_tokens: 16384,
      system: `${CONSTRUCTION_INTELLIGENCE_SYSTEM_PROMPT}

Existing Menlo compatibility rules:
${COMBINED_SYSTEM_PROMPT}`,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text response");

    const cleaned = textBlock.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result: {
      rooms?: Array<{ area_sqm: number }>;
      total_built_area_sqm?: number;
      totals?: { built_area_sqm?: number; doors_count?: number; windows_count?: number; floors?: number };
      windows?: { count?: number };
      doors?: { count?: number };
      summary?: string;
      boq_suggestions?: unknown;
    };
    try {
      result = JSON.parse(cleaned);
    } catch {
      // נסה לתקן JSON שנחתך
      result = { rooms: [], summary: "ניתוח התקבל באופן חלקי - JSON נחתך" };
    }
    result = normalizeSkillResult(result);

    const inputCost = (message.usage.input_tokens / 1_000_000) * 3;
    const outputCost = (message.usage.output_tokens / 1_000_000) * 15;
    const cost_usd = inputCost + outputCost;

    const totalArea =
      result.total_built_area_sqm ||
      result.totals?.built_area_sqm ||
      result.rooms?.reduce((s, r) => s + (r.area_sqm || 0), 0) || 0;
    const windowsCount = result.windows?.count ?? result.totals?.windows_count ?? 0;
    const doorsCount = result.doors?.count ?? result.totals?.doors_count ?? 0;

    // עדכן את כל הרשומות עם אותה תוצאה (משולב)
    const updatePromises = analysisRows.map((row) =>
      row.data
        ? supabase
            .from("plan_analyses")
            .update({
              status: "completed",
              ai_model: model,
              raw_response: { combined: true, result, message },
              rooms: result.rooms || [],
              windows_count: windowsCount,
              doors_count: doorsCount,
              total_area_sqm: totalArea,
              notes: `[ניתוח משולב של ${plans.length} תכניות]\n\n${result.summary || ""}`,
              cost_usd: cost_usd / plans.length, // חלוקת עלות
              completed_at: new Date().toISOString(),
            })
            .eq("id", row.data.id)
        : Promise.resolve()
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      combined: true,
      result,
      cost_usd,
      // החזר id של ראשון כדי שהמשתמש יוכל לראות את התוצאה
      combinedAnalysisId: analysisRows[0]?.data?.id,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown";
    await Promise.all(
      analysisRows.map((row) =>
        row.data
          ? supabase
              .from("plan_analyses")
              .update({
                status: "failed",
                error_message: errMsg,
                completed_at: new Date().toISOString(),
              })
              .eq("id", row.data.id)
          : Promise.resolve()
      )
    );
    throw e;
  }
}

export const maxDuration = 180;
