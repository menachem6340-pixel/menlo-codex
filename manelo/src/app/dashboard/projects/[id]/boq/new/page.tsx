"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowRight, Sparkles, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { BOQ_CHAPTERS } from "@/lib/boq/chapters";
import {
  calculateQuantitiesFromAnalysis,
  type CalculatedQuantity,
} from "@/lib/boq/quantity-calculator";
import { CATEGORIES, type PlanCategory } from "@/lib/plans/categories";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface AnalysisOption {
  id: string;
  plan_name: string;
  plan_category: PlanCategory;
  total_area_sqm: number;
  rooms_count: number;
  raw_data: Record<string, unknown>;
}

interface StoredAiMessage {
  content?: Array<{ type: string; text?: string }>;
}

interface StoredAnalysisResponse {
  combined?: boolean;
  result?: Record<string, unknown>;
  message?: StoredAiMessage;
  content?: Array<{ type: string; text?: string }>;
  rooms?: unknown;
  totals?: unknown;
  boq_suggestions?: unknown;
}

type CreationMode = "merged" | "separate";
type SupabaseClient = ReturnType<typeof createClient>;

export default function NewBoqPage({ params }: PageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetAnalysisId = searchParams.get("planAnalysisId");

  const [name, setName] = useState("");
  const [creationMode, setCreationMode] = useState<CreationMode>("merged");
  const [analyses, setAnalyses] = useState<AnalysisOption[]>([]);
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(
    new Set(presetAnalysisId ? [presetAnalysisId] : [])
  );
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("plan_analyses")
        .select("id, total_area_sqm, raw_response, rooms, plan:plans!inner(name, category, project_id)")
        .eq("status", "completed")
        .eq("plan.project_id", projectId);

      const opts: AnalysisOption[] = (data || []).map((a) => {
        const plan = a.plan as unknown as { name: string; category: PlanCategory };
        const rooms = (a.rooms as Array<unknown>) || [];
        const rawData = {
          ...extractStoredAnalysis(a.raw_response, a.rooms),
          plan_category: plan.category || "other",
          plan_name: plan.name,
        };

        return {
          id: a.id,
          plan_name: plan.name,
          plan_category: plan.category || "other",
          total_area_sqm: a.total_area_sqm || 0,
          rooms_count: rooms.length,
          raw_data: rawData,
        };
      });
      setAnalyses(opts);
      const defaultSelected = new Set(
        presetAnalysisId ? opts.filter((a) => a.id === presetAnalysisId).map((a) => a.id) : opts.map((a) => a.id)
      );
      setSelectedAnalyses(defaultSelected);

      const defaultQuantities = calculateQuantitiesFromAnalysis(
        opts
          .filter((a) => defaultSelected.has(a.id))
          .map((a) => a.raw_data) as Parameters<typeof calculateQuantitiesFromAnalysis>[0]
      );
      const chaptersWithQuantities = new Set(Object.keys(defaultQuantities));
      setSelectedChapters(
        new Set(
          BOQ_CHAPTERS.filter((chapter) => chaptersWithQuantities.has(chapter.name)).map(
            (chapter) => chapter.name
          )
        )
      );
      setLoadingAnalyses(false);
    })();
  }, [presetAnalysisId, projectId]);

  function toggleAnalysis(id: string) {
    setSelectedAnalyses((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAllAnalyses() {
    if (selectedAnalyses.size === analyses.length) setSelectedAnalyses(new Set());
    else setSelectedAnalyses(new Set(analyses.map((a) => a.id)));
  }

  function toggleChapter(chapterName: string) {
    setSelectedChapters((s) => {
      const n = new Set(s);
      if (n.has(chapterName)) n.delete(chapterName);
      else n.add(chapterName);
      return n;
    });
  }

  function selectAllChapters() {
    if (selectedChapters.size === BOQ_CHAPTERS.length) setSelectedChapters(new Set());
    else setSelectedChapters(new Set(BOQ_CHAPTERS.map((c) => c.name)));
  }

  // חשב כמויות אוטומטיות מהניתוחים שנבחרו
  const selectedAnalysisList = analyses.filter((a) => selectedAnalyses.has(a.id));
  const calculatedQuantities = (() => {
    if (selectedAnalysisList.length === 0) return {};
    return calculateQuantitiesFromAnalysis(
      selectedAnalysisList.map((a) => a.raw_data) as Parameters<typeof calculateQuantitiesFromAnalysis>[0]
    );
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) throw new Error("לא נמצא ארגון");
      if (selectedAnalysisList.length === 0) throw new Error("בחר לפחות ניתוח תכנית אחד");

      const baseName = name || `כתב כמויות - ${new Date().toLocaleDateString("he-IL")}`;
      const createdIds: string[] = [];

      if (creationMode === "separate") {
        for (const analysis of selectedAnalysisList) {
          const boqId = await createBoqFromAnalyses({
            supabase,
            organizationId: profile.organization_id,
            projectId,
            analyses: [analysis],
            selectedChapters,
            name: `${baseName} - ${analysis.plan_name}`,
          });
          createdIds.push(boqId);
        }
      } else {
        const boqId = await createBoqFromAnalyses({
          supabase,
          organizationId: profile.organization_id,
          projectId,
          analyses: selectedAnalysisList,
          selectedChapters,
          name: selectedAnalysisList.length > 1 ? `${baseName} מאוחד` : baseName,
        });
        createdIds.push(boqId);
      }

      router.push(createdIds.length === 1 ? `/dashboard/boq/${createdIds[0]}` : `/dashboard/projects/${projectId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="כתב כמויות חדש"
        description="בחר ניתוחי תכניות ופרקי ביצוע - הכמויות יחושבו אוטומטית מהניתוח"
        action={
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardContent className="space-y-4 p-5">
            <Input
              label="שם כתב הכמויות"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמא: כתב כמויות - וילה משפחת כהן"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                אופן יצירת כתב הכמויות
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreationMode("merged")}
                  className={`rounded-lg border-2 p-4 text-right transition-colors ${
                    creationMode === "merged"
                      ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="font-semibold">כתב כמויות מחובר</div>
                  <p className="mt-1 text-xs text-neutral-600">
                    מחבר את כל התכניות שסומנו לכתב כמויות אחד לפרויקט.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode("separate")}
                  className={`rounded-lg border-2 p-4 text-right transition-colors ${
                    creationMode === "separate"
                      ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="font-semibold">כתב נפרד לכל תכנית</div>
                  <p className="mt-1 text-xs text-neutral-600">
                    יוצר כתב כמויות נפרד לכל תכנית שסימנת, כדי לבדוק ולתקן כל יועץ בנפרד.
                  </p>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* בחירת ניתוחי תכניות */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                <Sparkles className="h-4 w-4 inline ml-1 text-[var(--color-brand-blue)]" />
                ניתוחי תכניות לבסיס הכמויות ({selectedAnalyses.size}/{analyses.length})
              </span>
              {analyses.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={selectAllAnalyses}>
                  {selectedAnalyses.size === analyses.length ? "נקה הכל" : "בחר הכל"}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnalyses ? (
              <p className="text-sm text-neutral-500 text-center py-4">טוען ניתוחים...</p>
            ) : analyses.length === 0 ? (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <strong>אין ניתוחי תכניות בפרויקט הזה.</strong>
                  <br />
                  הכמויות יישארו 0 ותצטרך למלא ידנית.{" "}
                  <Link href={`/dashboard/projects/${projectId}`} className="underline">
                    חזור לפרויקט
                  </Link>{" "}
                  כדי להעלות תכניות ולנתח אותן קודם.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-neutral-600 mb-2">
                  בחר אילו ניתוחים יזינו את הכמויות. אפשר ליצור כתב מאוחד מכל התכניות או כתב נפרד לכל תכנית שסומנה.
                </p>
                {analyses.map((a) => {
                  const cat = CATEGORIES[a.plan_category];
                  const selected = selectedAnalyses.has(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAnalysis(a.id)}
                      className={`w-full p-3 rounded-lg border-2 text-right transition-all flex items-center gap-3 ${
                        selected
                          ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input type="checkbox" checked={selected} readOnly className="h-4 w-4" />
                      <FileText className="h-5 w-5 text-[var(--color-brand-blue)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{a.plan_name}</div>
                        <div className="text-xs text-neutral-500 flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded ${cat.color} text-[10px]`}>
                            {cat.emoji} {cat.label}
                          </span>
                          <span>{a.total_area_sqm} מ&quot;ר</span>
                          <span>·</span>
                          <span>{a.rooms_count} חדרים</span>
                        </div>
                      </div>
                      {selected && <CheckCircle className="h-5 w-5 text-green-600" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* תצוגה מקדימה של כמויות מחושבות */}
            {Object.keys(calculatedQuantities).length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  כמויות שיתמלאו אוטומטית מכלל התכניות ({Object.values(calculatedQuantities).flat().length} פריטים)
                </div>
                <div className="text-xs text-green-700 grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  {Object.entries(calculatedQuantities).map(([chapter, items]) =>
                    items.slice(0, 2).map((item, i) => (
                      <div key={`${chapter}-${i}`} className="truncate">
                        • {item.description}: <strong>{item.quantity} {item.unit}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* בחירת פרקים */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>פרקי ביצוע ({selectedChapters.size}/{BOQ_CHAPTERS.length})</span>
              <Button type="button" variant="outline" size="sm" onClick={selectAllChapters}>
                {selectedChapters.size === BOQ_CHAPTERS.length ? "נקה הכל" : "בחר הכל"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600 mb-4">
              כל פרק יכלול פריטים מומלצים עם מחירי שוק 2026. אם בחרת ניתוחים למעלה - הכמויות יתמלאו אוטומטית.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {BOQ_CHAPTERS.map((chapter) => {
                const selected = selectedChapters.has(chapter.name);
                const hasCalcQty = calculatedQuantities[chapter.name]?.length > 0;
                return (
                  <button
                    key={chapter.name}
                    type="button"
                    onClick={() => toggleChapter(chapter.name)}
                    className={`p-3 rounded-lg border-2 text-right transition-all ${
                      selected
                        ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{chapter.emoji}</span>
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {chapter.name}
                          {hasCalcQty && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              ✨ עם כמויות
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500">{chapter.items.length} פריטים</div>
                      </div>
                      {selected && <span className="text-[var(--color-brand-blue)]">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Link href={`/dashboard/projects/${projectId}`}>
              <Button type="button" variant="outline">ביטול</Button>
            </Link>
            <Button type="submit" disabled={loading || selectedChapters.size === 0}>
              {loading
                ? "יוצר..."
                : creationMode === "separate"
                  ? `צור ${selectedAnalyses.size} כתבי כמויות`
                  : `צור כתב כמויות מחובר (${selectedChapters.size} פרקים)`}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

async function createBoqFromAnalyses({
  supabase,
  organizationId,
  projectId,
  analyses,
  selectedChapters,
  name,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  projectId: string;
  analyses: AnalysisOption[];
  selectedChapters: Set<string>;
  name: string;
}): Promise<string> {
  const firstAnalysisId = analyses[0]?.id || null;
  const calculatedQuantities = calculateQuantitiesFromAnalysis(
    analyses.map((a) => a.raw_data) as Parameters<typeof calculateQuantitiesFromAnalysis>[0]
  );

  const { data: boq, error: boqErr } = await supabase
    .from("boqs")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      plan_analysis_id: firstAnalysisId,
      name,
      notes:
        analyses.length > 1
          ? `כתב כמויות מחובר מתוך ${analyses.length} ניתוחי תכניות`
          : `כתב כמויות מתוך תכנית: ${analyses[0]?.plan_name || ""}`,
    })
    .select("id")
    .single();

  if (boqErr || !boq) throw new Error(boqErr?.message || "שגיאה ביצירת כתב כמויות");

  const chosenChapters = BOQ_CHAPTERS.filter((chapter) => selectedChapters.has(chapter.name));
  let displayOrder = 0;

  for (const chapter of chosenChapters) {
    const { data: section, error: secErr } = await supabase
      .from("boq_sections")
      .insert({
        boq_id: boq.id,
        name: chapter.name,
        display_order: displayOrder++,
      })
      .select("id")
      .single();

    if (secErr || !section) continue;

    const calcItems = calculatedQuantities[chapter.name] || [];
    const calcMap = new Map(calcItems.map((calc) => [calc.description, calc]));

    const itemsToInsert = chapter.items.map((item, i) => {
      const matched = findBestMatch(item.description, calcMap);
      return {
        boq_id: boq.id,
        section_id: section.id,
        description: item.description,
        unit: item.unit,
        quantity: matched?.quantity || 0,
        unit_price: item.customer_price,
        display_order: i,
        notes: matched ? buildQuantityNote(matched) : null,
      };
    });

    for (const calc of calcItems) {
      const exists = chapter.items.some((item) => item.description === calc.description);
      if (!exists) {
        itemsToInsert.push({
          boq_id: boq.id,
          section_id: section.id,
          description: calc.description,
          unit: calc.unit,
          quantity: calc.quantity,
          unit_price: calc.unitPrice || 0,
          display_order: itemsToInsert.length,
          notes: buildQuantityNote(calc),
        });
      }
    }

    if (itemsToInsert.length > 0) {
      const { error } = await supabase.from("boq_items").insert(itemsToInsert);
      if (error) throw new Error(error.message);
    }
  }

  return boq.id;
}

function buildQuantityNote(calc: CalculatedQuantity): string {
  const parts = [
    calc.source ? `חישוב: ${calc.source}` : null,
    calc.sourceDrawing ? `מקור: ${calc.sourceDrawing}` : null,
    calc.roomOrZone ? `אזור: ${calc.roomOrZone}` : null,
    calc.extractionMethod ? `שיטת חילוץ: ${calc.extractionMethod}` : null,
    calc.confidenceScore ? `ביטחון: ${calc.confidenceScore}` : null,
    calc.validationStatus ? `סטטוס בדיקה: ${calc.validationStatus}` : null,
    calc.humanReviewRequired ? "נדרש אישור אדם" : null,
    calc.warnings?.length ? `אזהרות: ${calc.warnings.join("; ")}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

/**
 * מצא התאמה הכי טובה בין תיאור פריט לכמות מחושבת
 */
function findBestMatch(
  itemDescription: string,
  calcMap: Map<string, CalculatedQuantity>
): CalculatedQuantity | null {
  // חיפוש מדויק
  if (calcMap.has(itemDescription)) return calcMap.get(itemDescription)!;

  // חיפוש חלקי - מילים משותפות
  const itemWords = itemDescription.split(/\s+/).filter((w) => w.length > 2);
  for (const [calcDesc, qty] of calcMap) {
    const calcWords = calcDesc.split(/\s+/).filter((w) => w.length > 2);
    const common = itemWords.filter((w) => calcWords.some((cw) => cw.includes(w) || w.includes(cw)));
    if (common.length >= 2) return qty;
  }
  return null;
}

function extractStoredAnalysis(
  rawResponse: unknown,
  fallbackRooms: unknown
): Record<string, unknown> {
  const raw = rawResponse as StoredAnalysisResponse | null;

  if (raw?.result && typeof raw.result === "object") {
    return raw.result;
  }

  if (raw?.rooms || raw?.totals || raw?.boq_suggestions) {
    return raw as Record<string, unknown>;
  }

  const message = raw?.message || raw;
  const text = message?.content?.find((c) => c.type === "text")?.text;
  if (text) {
    try {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      // השתמש רק בחדרים הבסיסיים
    }
  }

  return { rooms: fallbackRooms || [] };
}
