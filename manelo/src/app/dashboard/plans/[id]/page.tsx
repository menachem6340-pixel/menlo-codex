import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteRecordButton } from "@/components/actions/delete-record-button";
import { AnalyzePlanButton } from "@/components/plans/analyze-plan-button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  ArrowRight,
  FileText,
  Home,
  Square,
  DoorOpen,
  Calculator,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Room {
  name: string;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  area_sqm: number;
  perimeter_m?: number;
  floor_type?: string;
  wall_finish?: string;
  uncertain?: boolean;
  notes?: string;
}

interface BoqChapter {
  chapter: string;
  items: Array<{
    description: string;
    unit: string;
    quantity: number;
    calculation?: string;
    estimated_unit_price_ils?: number;
  }>;
}

interface RiskItem {
  severity: "INFO" | "WARNING" | "CRITICAL" | string;
  title: string;
  description?: string;
  source_drawing?: string;
  recommendation?: string;
  commercial_impact?: string;
}

interface ValidationCheck {
  name: string;
  status: "pass" | "warning" | "fail" | string;
  details?: string;
}

interface QuantitySummaryItem {
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
  human_review_required?: boolean;
}

interface AnalysisRaw {
  skill?: { name?: string; version?: string };
  rooms?: Room[];
  totals?: {
    built_area_sqm?: number;
    rooms_count?: number;
    doors_count?: number;
    windows_count?: number;
    wet_rooms_count?: number;
  };
  openings?: {
    doors?: Array<{ type: string; width_m: number; height_m: number; count: number; location?: string }>;
    windows?: Array<{ type: string; width_m: number; height_m: number; count: number; location?: string }>;
  };
  project_type_he?: string;
  scale?: string;
  scale_confidence?: string;
  summary?: string;
  quantity_summary?: QuantitySummaryItem[];
  validation_report?: {
    sanity_checks?: ValidationCheck[];
    cross_discipline_checks?: ValidationCheck[];
  };
  risk_analysis?: RiskItem[];
  ai_recommendations?: RiskItem[];
  human_review?: {
    required?: boolean;
    questions?: string[];
    low_confidence_items?: string[];
  };
  boq_suggestions?: BoqChapter[];
  ambiguities?: string[];
  warnings?: string[];
  confidence_overall?: string;
}

interface StoredAnalysisResponse {
  result?: AnalysisRaw;
  message?: { content?: Array<{ type: string; text?: string }> };
  content?: Array<{ type: string; text?: string }>;
}

export default async function PlanDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("plans")
    .select("*, project:projects(id, name)")
    .eq("id", id)
    .single();

  if (!plan) notFound();

  const { data: analysis } = await supabase
    .from("plan_analyses")
    .select("*")
    .eq("plan_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const project = plan.project as { id: string; name: string } | null;
  const rooms: Room[] = (analysis?.rooms as Room[] | null) || [];

  // המידע המלא מ-raw_response
  const fullData: AnalysisRaw = (() => {
    if (!analysis?.raw_response) return {};
    const raw = analysis.raw_response as StoredAnalysisResponse;
    if (raw.result) return raw.result;

    const message = raw.message || raw;
    if (!message?.content) return {};
    const text = message.content.find((c) => c.type === "text")?.text || "";
    try {
      return JSON.parse(
        text
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim()
      );
    } catch {
      return {};
    }
  })();
  const summaryStats = buildAnalysisStats(plan.category || "", analysis, rooms, fullData);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={plan.name}
        description={
          fullData.project_type_he
            ? `${project?.name} · ${fullData.project_type_he}`
            : project?.name
        }
        action={
          <div className="flex gap-2 flex-wrap">
            {project && (
              <Link href={`/dashboard/projects/${project.id}`}>
                <Button variant="outline" size="sm">
                  <ArrowRight className="h-4 w-4" />
                  לפרויקט
                </Button>
              </Link>
            )}
            <AnalyzePlanButton planId={plan.id} hasAnalysis={Boolean(analysis)} />
            {analysis?.id && (
              <DeleteRecordButton id={analysis.id} type="plan_analysis" label="מחק ניתוח" />
            )}
            <DeleteRecordButton
              id={plan.id}
              type="plan"
              label="מחק תכנית"
              redirectTo="/dashboard/plans"
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* תצוגת הקובץ */}
        <Card className="lg:col-span-1 lg:sticky lg:top-4 lg:self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              קובץ התכנית
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={plan.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-[3/4] rounded-lg border border-neutral-200 bg-neutral-50 hover:border-[var(--color-brand-yellow)] transition-colors overflow-hidden"
            >
              {plan.file_type === "image" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={plan.file_url} alt={plan.name} className="w-full h-full object-contain" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <FileText className="h-16 w-16 text-[var(--color-brand-blue)] mb-3" />
                  <p className="font-medium">לחץ כדי לפתוח את ה-PDF</p>
                  <p className="text-xs text-neutral-500 mt-1">{plan.file_size_kb} KB</p>
                </div>
              )}
            </a>
            {fullData.scale && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-neutral-500">קנה מידה:</span>
                <span className="font-mono font-bold">{fullData.scale}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* תוצאות ניתוח */}
        <div className="lg:col-span-2 space-y-6">
          {!analysis && (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-neutral-400" />
                <p className="text-neutral-600">עדיין לא בוצע ניתוח לתכנית</p>
              </CardContent>
            </Card>
          )}

          {analysis?.status === "processing" && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-pulse text-3xl text-[var(--color-brand-blue)] mb-3">✨</div>
                <p className="font-medium">AI מנתח את התכנית...</p>
                <p className="text-sm text-neutral-500 mt-1">רענן את הדף בעוד דקה</p>
              </CardContent>
            </Card>
          )}

          {analysis?.status === "failed" && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <p className="font-medium text-red-800 mb-2">הניתוח נכשל</p>
                <p className="text-sm text-red-700">{analysis.error_message}</p>
              </CardContent>
            </Card>
          )}

          {analysis?.status === "completed" && (
            <>
              {/* סיכום מספרים */}
              <AnalysisStats stats={summaryStats} />

              <AnalysisEngineNotice version={fullData.skill?.version || "5.0"} category={plan.category || ""} />

              {/* התראות */}
              {(fullData.warnings?.length || fullData.ambiguities?.length) && (
                <Card className="border-yellow-300 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-700 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        {fullData.warnings && fullData.warnings.length > 0 && (
                          <div className="mb-2">
                            <strong className="text-yellow-900">התראות:</strong>
                            <ul className="list-disc mr-5 text-yellow-800 mt-1">
                              {fullData.warnings.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {fullData.ambiguities && fullData.ambiguities.length > 0 && (
                          <div>
                            <strong className="text-yellow-900">דברים לא ברורים שצריך לוודא:</strong>
                            <ul className="list-disc mr-5 text-yellow-800 mt-1">
                              {fullData.ambiguities.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {fullData.human_review?.required && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-base">נדרש אישור אדם</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-red-900">
                    {fullData.human_review.questions?.length ? (
                      <div>
                        <div className="font-semibold mb-1">שאלות לפני כתב כמויות סופי</div>
                        <ul className="list-disc mr-5 space-y-1">
                          {fullData.human_review.questions.map((question, index) => (
                            <li key={index}>{question}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {fullData.human_review.low_confidence_items?.length ? (
                      <div>
                        <div className="font-semibold mb-1">פריטים בביטחון נמוך</div>
                        <ul className="list-disc mr-5 space-y-1">
                          {fullData.human_review.low_confidence_items.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {fullData.risk_analysis && fullData.risk_analysis.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">סיכונים והמלצות ביצוע</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {fullData.risk_analysis.map((risk, index) => (
                      <RiskRow key={index} item={risk} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {fullData.ai_recommendations && fullData.ai_recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">המלצות AI לפרויקט</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {fullData.ai_recommendations.map((recommendation, index) => (
                      <RiskRow key={index} item={recommendation} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {fullData.validation_report && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">בדיקות הנדסיות</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ValidationList title="בדיקות היגיון כמויות" items={fullData.validation_report.sanity_checks || []} />
                    <ValidationList title="הצלבות בין יועצים" items={fullData.validation_report.cross_discipline_checks || []} />
                  </CardContent>
                </Card>
              )}

              {fullData.quantity_summary && fullData.quantity_summary.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">עקיבות כמויות מרכזיות</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: "760px" }}>
                        <thead>
                          <tr className="border-b border-neutral-200">
                            <th className="text-right py-2 font-medium text-neutral-700">כמות</th>
                            <th className="text-right py-2 font-medium text-neutral-700">מקור</th>
                            <th className="text-right py-2 font-medium text-neutral-700">חישוב</th>
                            <th className="text-right py-2 font-medium text-neutral-700">ביטחון</th>
                            <th className="text-right py-2 font-medium text-neutral-700">סטטוס</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fullData.quantity_summary.slice(0, 12).map((item, index) => (
                            <tr key={index} className="border-b border-neutral-100 last:border-0">
                              <td className="py-2 font-medium">
                                {item.quantity}: <span className="ltr-numbers">{formatNumber(item.amount)} {item.unit}</span>
                              </td>
                              <td className="py-2 text-xs text-neutral-600">{item.source_drawing || item.drawing_number || "—"}</td>
                              <td className="py-2 text-xs text-neutral-600">{item.calculation || item.extraction_method || "—"}</td>
                              <td className="py-2 ltr-numbers">{item.confidence_score ?? "—"}</td>
                              <td className="py-2 text-xs">{item.validation_status || (item.human_review_required ? "Human review required" : "—")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {fullData.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">סיכום</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{fullData.summary}</p>
                  </CardContent>
                </Card>
              )}

              {rooms.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">פירוט חדרים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-neutral-200">
                            <th className="text-right py-2 font-medium text-neutral-700">חדר</th>
                            <th className="text-right py-2 font-medium text-neutral-700">אורך×רוחב×גובה</th>
                            <th className="text-right py-2 font-medium text-neutral-700">שטח (מ״ר)</th>
                            <th className="text-right py-2 font-medium text-neutral-700">ריצוף</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rooms.map((r, i) => (
                            <tr key={i} className="border-b border-neutral-100 last:border-0">
                              <td className="py-2 font-medium">
                                {r.name}
                                {r.uncertain && <span className="mr-2 text-xs text-yellow-600">⚠</span>}
                              </td>
                              <td className="py-2 ltr-numbers text-xs text-neutral-600">
                                {r.length_m && r.width_m
                                  ? `${formatNumber(r.length_m)}×${formatNumber(r.width_m)}${r.height_m ? `×${formatNumber(r.height_m)}` : ""}`
                                  : "—"}
                              </td>
                              <td className="py-2 ltr-numbers font-medium">{formatNumber(r.area_sqm)}</td>
                              <td className="py-2 text-neutral-600 text-xs">{r.floor_type || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-neutral-300 font-semibold">
                            <td className="py-2">סה״כ</td>
                            <td></td>
                            <td className="py-2 ltr-numbers">
                              {formatNumber(rooms.reduce((s, r) => s + (r.area_sqm || 0), 0))}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* פתחים */}
              {(fullData.openings?.doors?.length || fullData.openings?.windows?.length) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">פתחים</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fullData.openings.doors && fullData.openings.doors.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-neutral-700 mb-2">דלתות</div>
                        <table className="w-full text-sm">
                          <tbody>
                            {fullData.openings.doors.map((d, i) => (
                              <tr key={i} className="border-b border-neutral-100">
                                <td className="py-1.5">{d.type}</td>
                                <td className="py-1.5 ltr-numbers text-xs text-neutral-600">{d.width_m}×{d.height_m} מ׳</td>
                                <td className="py-1.5 text-center">{d.count} יח׳</td>
                                <td className="py-1.5 text-xs text-neutral-500">{d.location || ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {fullData.openings.windows && fullData.openings.windows.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-neutral-700 mb-2">חלונות</div>
                        <table className="w-full text-sm">
                          <tbody>
                            {fullData.openings.windows.map((w, i) => (
                              <tr key={i} className="border-b border-neutral-100">
                                <td className="py-1.5">{w.type}</td>
                                <td className="py-1.5 ltr-numbers text-xs text-neutral-600">{w.width_m}×{w.height_m} מ׳</td>
                                <td className="py-1.5 text-center">{w.count} יח׳</td>
                                <td className="py-1.5 text-xs text-neutral-500">{w.location || ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* הצעת כתב כמויות */}
              {fullData.boq_suggestions && fullData.boq_suggestions.length > 0 && (
                <Card className="border-[var(--color-brand-yellow)]/40">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      הצעת כתב כמויות (טיוטה אוטומטית)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fullData.boq_suggestions.map((chapter, i) => (
                      <div key={i}>
                        <div className="font-semibold text-sm text-[var(--color-brand-dark)] mb-2 pb-1 border-b border-neutral-200">
                          {chapter.chapter}
                        </div>
                        <table className="w-full text-sm">
                          <tbody>
                            {chapter.items.map((item, j) => (
                              <tr key={j} className="border-b border-neutral-100 last:border-0">
                                <td className="py-2 align-top">
                                  <div className="font-medium">{item.description}</div>
                                  {item.calculation && (
                                    <div className="text-xs text-neutral-500 mt-0.5">{item.calculation}</div>
                                  )}
                                </td>
                                <td className="py-2 ltr-numbers text-center w-24">
                                  {formatNumber(item.quantity)} {item.unit}
                                </td>
                                <td className="py-2 ltr-numbers text-left w-28 font-medium">
                                  {item.estimated_unit_price_ils
                                    ? formatCurrency(item.estimated_unit_price_ils * item.quantity)
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* פעולה הבאה */}
              <Card className="bg-[var(--color-brand-yellow)]/10 border-[var(--color-brand-yellow)]/30">
                <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold mb-1">הצעד הבא</h3>
                    <p className="text-sm text-neutral-700">
                      צור הצעת מחיר מבוססת על הניתוח הזה
                    </p>
                  </div>
                  {project && (
                    <Link href={`/dashboard/quotes/new?projectId=${project.id}`}>
                      <Button>
                        <Calculator className="h-4 w-4" />
                        צור הצעת מחיר
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              {analysis.cost_usd && (
                <p className="text-xs text-neutral-400 text-center">
                  ביטחון כללי: {fullData.confidence_overall || "לא צוין"} · עלות AI: ${analysis.cost_usd.toFixed(4)}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface AnalysisStatItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}

interface QuantityRow {
  label: string;
  unit: string;
  amount: number;
}

function AnalysisStats({ stats }: { stats: AnalysisStatItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <AnalysisStat key={stat.label} {...stat} />
      ))}
    </div>
  );
}

function AnalysisStat({ icon: Icon, label, value, hint }: AnalysisStatItem) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span>{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-yellow)]/20 text-[var(--color-brand-blue)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold text-[var(--color-brand-dark)] ltr-numbers">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}

function AnalysisEngineNotice({ version, category }: { version: string; category: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-blue-950 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-base font-semibold">מנוע ניתוח הנדסי</div>
          <p className="mt-1 text-sm leading-6">
            הניתוח מציג רק כמויות שנמצאו או חושבו, עם מקור, ביטחון, בדיקות סיכון ואי ודאות לפני יצירת כתב כמויות.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-brand-blue)] shadow-sm">
          גרסה {version}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg bg-white/75 px-3 py-2">מקור לכל כמות</div>
        <div className="rounded-lg bg-white/75 px-3 py-2">רמת ביטחון</div>
        <div className="rounded-lg bg-white/75 px-3 py-2">בדיקות סיכון</div>
        <div className="rounded-lg bg-white/75 px-3 py-2">בדיקת אדם</div>
      </div>
      {category !== "architecture" && (
        <p className="mt-3 text-xs leading-5 text-blue-900">
          אם זו לא תכנית אדריכלית, חדרים/חלונות/דלתות לא יוצגו כמדד ראשי. המערכת תציג את הכמויות המתאימות לסוג התכנית.
        </p>
      )}
    </div>
  );
}

function buildAnalysisStats(
  category: string,
  analysis: { total_area_sqm?: number | null; windows_count?: number | null; doors_count?: number | null } | null,
  rooms: Room[],
  fullData: AnalysisRaw
): AnalysisStatItem[] {
  const normalized = category.toLowerCase();
  const rows = collectQuantityRows(fullData);

  if (normalized === "structure" || normalized === "structural" || normalized.includes("קונס")) {
    return [
      {
        icon: Square,
        label: "בטון",
        value: formatWithUnit(sumRows(rows, ["בטון", "concrete"], ["מ״ק", "מ\"ק", "m3", "m³"]), "מ״ק"),
        hint: "מתכנית קונסטרוקציה",
      },
      {
        icon: Calculator,
        label: "ברזל",
        value: formatRebar(rows),
        hint: "זיון / רשתות",
      },
      {
        icon: Home,
        label: "יסודות",
        value: formatWithUnit(sumRows(rows, ["יסוד", "כלונס", "רפסודה", "foundation"]), "יח׳"),
      },
      {
        icon: DoorOpen,
        label: "קורות / עמודים",
        value: formatWithUnit(sumRows(rows, ["קורה", "קורות", "עמוד", "עמודים", "beam", "column"]), "יח׳"),
      },
    ];
  }

  if (normalized === "electrical") {
    return [
      { icon: Square, label: "נקודות חשמל", value: formatWithUnit(sumRows(rows, ["נקודת חשמל", "נקודות חשמל", "שקע"]), "יח׳") },
      { icon: Home, label: "תאורה", value: formatWithUnit(sumRows(rows, ["תאורה", "גוף תאורה", "lighting"]), "יח׳") },
      { icon: Calculator, label: "לוחות", value: formatWithUnit(sumRows(rows, ["לוח", "panel"]), "יח׳") },
      { icon: DoorOpen, label: "צנרת / תעלות", value: formatWithUnit(sumRows(rows, ["צינור", "תעלה", "כבל", "conduit", "tray"], ["מ", "מ׳", "m"]), "מ׳") },
    ];
  }

  if (normalized === "plumbing" || normalized === "drainage") {
    return [
      { icon: Square, label: "צנרת מים", value: formatWithUnit(sumRows(rows, ["מים", "water line", "צנרת"], ["מ", "מ׳", "m"]), "מ׳") },
      { icon: Home, label: "ניקוז / ביוב", value: formatWithUnit(sumRows(rows, ["ניקוז", "ביוב", "דלוחין", "drainage", "sewage"], ["מ", "מ׳", "m"]), "מ׳") },
      { icon: Calculator, label: "נקודות", value: formatWithUnit(sumRows(rows, ["נקודת", "אסלה", "כיור", "ברז"], ["יח", "יח׳", "pcs"]), "יח׳") },
      { icon: DoorOpen, label: "אביזרים", value: formatWithUnit(sumRows(rows, ["אביזר", "accessory", "סיפון"]), "יח׳") },
    ];
  }

  if (normalized === "hvac") {
    return [
      { icon: Square, label: "יחידות", value: formatWithUnit(sumRows(rows, ["יחידת", "מזגן", "מאייד", "unit"], ["יח", "יח׳", "pcs"]), "יח׳") },
      { icon: Home, label: "תעלות", value: formatWithUnit(sumRows(rows, ["תעלה", "duct"], ["מ", "מ׳", "m"]), "מ׳") },
      { icon: Calculator, label: "צנרת", value: formatWithUnit(sumRows(rows, ["צנרת", "pipe"], ["מ", "מ׳", "m"]), "מ׳") },
      { icon: DoorOpen, label: "גרילים", value: formatWithUnit(sumRows(rows, ["גריל", "מפזר", "grill"]), "יח׳") },
    ];
  }

  if (normalized === "waterproofing") {
    return [
      { icon: Square, label: "שטחי איטום", value: formatWithUnit(sumRows(rows, ["איטום", "waterproof"], ["מ״ר", "מ\"ר", "sqm", "m2"]), "מ״ר") },
      { icon: Home, label: "חדרים רטובים", value: formatWithUnit(Number(fullData.totals?.wet_rooms_count || 0), "יח׳") },
      { icon: Calculator, label: "יריעות / שכבות", value: formatWithUnit(sumRows(rows, ["יריעה", "ביטומ", "membrane"], ["מ״ר", "מ\"ר", "sqm", "m2"]), "מ״ר") },
      { icon: DoorOpen, label: "פרטים", value: formatWithUnit(sumRows(rows, ["פרט", "רולקה", "detail"]), "יח׳") },
    ];
  }

  return [
    { icon: Square, label: "שטח כולל", value: `${formatNumber(analysis?.total_area_sqm || 0)} מ״ר`, hint: "אדריכלות" },
    { icon: Home, label: "חדרים", value: `${rooms.length}` },
    { icon: Square, label: "חלונות", value: `${analysis?.windows_count || 0}` },
    { icon: DoorOpen, label: "דלתות", value: `${analysis?.doors_count || 0}` },
  ];
}

function collectQuantityRows(fullData: AnalysisRaw): QuantityRow[] {
  const summaryRows =
    fullData.quantity_summary?.map((item) => ({
      label: item.quantity || "",
      unit: item.unit || "",
      amount: Number(item.amount || 0),
    })) || [];

  const boqRows =
    fullData.boq_suggestions?.flatMap((chapter) =>
      chapter.items.map((item) => ({
        label: `${chapter.chapter} ${item.description}`,
        unit: item.unit || "",
        amount: Number(item.quantity || 0),
      }))
    ) || [];

  return [...summaryRows, ...boqRows].filter((row) => row.amount > 0);
}

function sumRows(rows: QuantityRow[], labelNeedles: string[], unitNeedles?: string[]) {
  return rows
    .filter((row) => includesAny(row.label, labelNeedles))
    .filter((row) => !unitNeedles || includesAny(row.unit, unitNeedles))
    .reduce((sum, row) => sum + row.amount, 0);
}

function includesAny(value: string, needles: string[]) {
  const lowerValue = value.toLowerCase();
  return needles.some((needle) => lowerValue.includes(needle.toLowerCase()));
}

function formatWithUnit(value: number, unit: string) {
  return `${formatNumber(value || 0)} ${unit}`;
}

function formatRebar(rows: QuantityRow[]) {
  const kg = sumRows(rows, ["ברזל", "זיון", "rebar", "steel"], ["קג", "ק\"ג", "ק״ג", "kg"]);
  if (kg > 0) return `${formatNumber(kg)} ק״ג`;

  const ton = sumRows(rows, ["ברזל", "זיון", "rebar", "steel"], ["טון", "ton"]);
  if (ton > 0) return `${formatNumber(ton)} טון`;

  return "0 ק״ג";
}

function RiskRow({ item }: { item: RiskItem }) {
  const color =
    item.severity === "CRITICAL"
      ? "border-red-200 bg-red-50 text-red-900"
      : item.severity === "WARNING"
        ? "border-yellow-200 bg-yellow-50 text-yellow-900"
        : "border-blue-100 bg-blue-50 text-blue-900";

  return (
    <div className={`rounded-lg border p-3 text-sm ${color}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">{item.title}</div>
        <span className="text-xs font-mono">{item.severity}</span>
      </div>
      {item.description && <p className="mt-1 text-xs leading-5">{item.description}</p>}
      {item.source_drawing && <p className="mt-1 text-xs">מקור: {item.source_drawing}</p>}
      {item.recommendation && <p className="mt-1 text-xs font-medium">המלצה: {item.recommendation}</p>}
    </div>
  );
}

function ValidationList({ title, items }: { title: string; items: ValidationCheck[] }) {
  return (
    <div>
      <div className="font-semibold text-sm mb-2">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-neutral-500">לא נמצאו בדיקות להצגה</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-neutral-200 p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.name}</span>
                <span className={item.status === "pass" ? "text-green-700" : item.status === "fail" ? "text-red-700" : "text-yellow-700"}>
                  {item.status}
                </span>
              </div>
              {item.details && <p className="mt-1 text-neutral-600">{item.details}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
