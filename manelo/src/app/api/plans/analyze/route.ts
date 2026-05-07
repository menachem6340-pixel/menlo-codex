import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzePlanFromUrl } from "@/lib/ai/plan-analysis";
import { getAnthropicKey } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const { planId } = (await req.json()) as { planId: string };

    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }

    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "מפתח ה-AI לא מוגדר. הוסף ANTHROPIC_API_KEY ל-.env.local והפעל מחדש את השרת.",
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // צור רשומת ניתוח בסטטוס processing
    const { data: analysis } = await supabase
      .from("plan_analyses")
      .insert({
        plan_id: planId,
        organization_id: plan.organization_id,
        status: "processing",
      })
      .select("id")
      .single();

    if (!analysis) {
      return NextResponse.json({ error: "Failed to create analysis" }, { status: 500 });
    }

    try {
      const fileType = (plan.file_type === "pdf" ? "pdf" : "image") as "pdf" | "image";
      const { result, raw, cost_usd, model } = await analyzePlanFromUrl({
        fileUrl: plan.file_url,
        fileType,
        apiKey,
        planName: plan.name,
        planCategory: plan.category,
      });

      // חשב שטח כולל
      const totalArea =
        result.total_built_area_sqm ||
        result.rooms.reduce((sum, r) => sum + (r.area_sqm || 0), 0);

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

      return NextResponse.json({
        success: true,
        analysisId: analysis.id,
        result,
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Unknown error";

      await supabase
        .from("plan_analyses")
        .update({
          status: "failed",
          error_message: errMsg,
          completed_at: new Date().toISOString(),
        })
        .eq("id", analysis.id);

      return NextResponse.json({ error: `שגיאת AI: ${errMsg}` }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const maxDuration = 90;
