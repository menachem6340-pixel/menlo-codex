"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FileText, Sparkles, Trash2, CheckCircle, Clock, AlertCircle, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, type PlanCategory } from "@/lib/plans/categories";

interface PlanWithAnalysis {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  category: PlanCategory;
  created_at: string;
  analysis?: {
    id?: string;
    status: string;
    total_area_sqm?: number;
  } | null;
}

interface PlansSectionProps {
  projectId: string;
  plans: PlanWithAnalysis[];
}

export function PlansSection({ projectId, plans }: PlansSectionProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === plans.length) setSelected(new Set());
    else setSelected(new Set(plans.map((p) => p.id)));
  }

  async function changeCategory(planId: string, newCategory: PlanCategory) {
    const supabase = createClient();
    await supabase.from("plans").update({ category: newCategory }).eq("id", planId);
    setEditingCategory(null);
    router.refresh();
  }

  async function saveName(planId: string) {
    if (!tempName.trim()) {
      setEditingName(null);
      return;
    }
    const supabase = createClient();
    await supabase.from("plans").update({ name: tempName.trim() }).eq("id", planId);
    setEditingName(null);
    setTempName("");
    router.refresh();
  }

  async function deletePlan(planId: string) {
    if (!confirm("למחוק את התכנית? פעולה זו אינה ניתנת לביטול.")) return;
    const supabase = createClient();
    await supabase.from("plans").delete().eq("id", planId);
    router.refresh();
  }

  async function deletePlanAnalysis(analysisId: string) {
    if (!confirm("למחוק את ניתוח התכנית? קובץ התכנית יישאר, ורק תוצאת הניתוח תימחק.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("plan_analyses").delete().eq("id", analysisId);
    if (error) {
      alert(`מחיקת הניתוח נכשלה: ${error.message}`);
      return;
    }
    router.refresh();
  }

  async function deleteSelectedAnalyses() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`למחוק את ניתוחי ה-AI של ${ids.length} תכניות? קבצי התכניות יישארו.`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("plan_analyses").delete().in("plan_id", ids);
    if (error) {
      alert(`מחיקת הניתוחים נכשלה: ${error.message}`);
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  async function deleteSelectedPlans() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`למחוק ${ids.length} תכניות? פעולה זו תמחק גם את ניתוחי ה-AI שלהן.`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("plans").delete().in("id", ids);
    if (error) {
      alert(`מחיקת התכניות נכשלה: ${error.message}`);
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  async function analyzeSelected(combined: boolean) {
    const ids = Array.from(selected);
    await analyzePlanIds(ids, combined);
  }

  async function analyzeProject() {
    await analyzePlanIds(
      plans.map((plan) => plan.id),
      true
    );
  }

  async function analyzePlanIds(ids: string[], combined: boolean) {
    if (ids.length === 0) {
      setError("בחר לפחות תכנית אחת לניתוח");
      return;
    }

    setError(null);
    setAnalyzing(true);
    setProgressPercent(5);
    setProgress(
      combined
        ? `✨ AI מנתח ${ids.length} תכניות יחד - יקח 1-2 דקות`
        : `✨ AI מנתח כל תכנית בנפרד - יקח כ-${Math.ceil(ids.length * 0.5)} דקות`
    );

    // אנימציה של מד התקדמות (עולה לאט עד 90%, מסיים ב-100% בסוף)
    const startTime = Date.now();
    const estimatedMs = combined ? 90_000 : ids.length * 30_000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / estimatedMs, 0.9);
      setProgressPercent(5 + ratio * 85);
    }, 500);

    try {
      const res = await fetch("/api/plans/analyze-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planIds: ids, combined }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "ניתוח נכשל");
      }

      setProgressPercent(100);
      setProgress("✓ הניתוח הושלם. עכשיו אפשר ליצור כתב כמויות מהפרויקט.");
      await res.json();
      setTimeout(() => {
        router.refresh();
        setSelected(new Set());
        setProgressPercent(0);
      }, 600);
    } catch (e) {
      clearInterval(interval);
      setError(e instanceof Error ? e.message : "שגיאה");
      setProgressPercent(0);
    } finally {
      setAnalyzing(false);
    }
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-neutral-500">
        עוד לא הועלו תכניות. לחץ על &quot;העלה תכנית&quot; למעלה כדי להתחיל.
      </div>
    );
  }

  // קבץ לפי קטגוריה
  const grouped = plans.reduce<Record<string, PlanWithAnalysis[]>>((acc, p) => {
    const cat = p.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  // סדר קבוע של קטגוריות
  const orderedCategories = (Object.keys(CATEGORIES) as PlanCategory[]).filter(
    (c) => grouped[c]?.length
  );

  return (
    <div>
      {/* פעולות עליונות */}
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 mb-4 text-sm text-blue-900">
        <div className="font-semibold">ניתוח תכניות פרויקט לפי הפרומפט ההנדסי</div>
        <p className="mt-1 text-xs leading-5">
          העלה את כל התכניות, סמן אותן לפי קטגוריה, ואז לחץ על ניתוח פרויקט מלא. המערכת תצליב אדריכלות,
          קונסטרוקציה ומערכות, ותכין בסיס לכתב כמויות מסודר לפי ענפים, סעיפים, יחידות וכמויות.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.size === plans.length}
            onChange={selectAll}
            className="h-4 w-4"
            id="select-all"
          />
          <label htmlFor="select-all" className="cursor-pointer">
            בחר הכל ({selected.size}/{plans.length})
          </label>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={plans.length === 0 || analyzing}
            onClick={analyzeProject}
            title={plans.length === 0 ? "צריך להעלות לפחות תכנית אחת" : ""}
          >
            <Sparkles className="h-4 w-4" />
            נתח פרויקט מלא לפי הפרומפט
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0 || analyzing}
            onClick={() => analyzeSelected(false)}
          >
            <Sparkles className="h-4 w-4" />
            נתח בנפרד ({selected.size})
          </Button>
          <Button
            size="sm"
            disabled={selected.size < 2 || analyzing}
            onClick={() => analyzeSelected(true)}
            title={selected.size < 2 ? "בחר לפחות 2 תכניות" : ""}
          >
            <Sparkles className="h-4 w-4" />
            נתח את כולן יחד ({selected.size})
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0 || analyzing}
            onClick={deleteSelectedAnalyses}
          >
            <Trash2 className="h-4 w-4" />
            מחק ניתוחים ({selected.size})
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={selected.size === 0 || analyzing}
            onClick={deleteSelectedPlans}
          >
            <Trash2 className="h-4 w-4" />
            מחק תכניות ({selected.size})
          </Button>
          <Link href={`/dashboard/projects/${projectId}/boq/new`}>
            <Button variant="outline" size="sm">
              כתב כמויות
            </Button>
          </Link>
        </div>
      </div>

      {progress && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-3">
          <div className="flex items-center justify-between text-sm text-blue-800 mb-2">
            <span>{progress}</span>
            <span className="font-mono font-bold">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-blue)] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-3">
          {error}
        </div>
      )}

      {/* תכניות מקובצות לפי קטגוריה */}
      <div className="space-y-5">
        {orderedCategories.map((cat) => {
          const meta = CATEGORIES[cat];
          const list = grouped[cat];
          return (
            <div key={cat}>
              <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.color} mb-2`}>
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span className="opacity-60">· {list.length}</span>
              </div>

              <div className="space-y-1.5">
                {list.map((p) => {
                  const isSelected = selected.has(p.id);
                  const status = p.analysis?.status;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                        isSelected
                          ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(p.id)}
                        className="h-4 w-4 shrink-0"
                      />
                      <FileText className="h-4 w-4 text-[var(--color-brand-blue)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        {editingName === p.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={() => saveName(p.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveName(p.id);
                              if (e.key === "Escape") {
                                setEditingName(null);
                                setTempName("");
                              }
                            }}
                            className="w-full h-7 px-2 rounded border border-[var(--color-brand-yellow)] focus:outline-none text-sm"
                          />
                        ) : (
                          <Link
                            href={`/dashboard/plans/${p.id}`}
                            className="font-medium text-sm truncate block hover:text-[var(--color-brand-blue)]"
                          >
                            {p.name}
                          </Link>
                        )}
                        <div className="text-xs text-neutral-500 flex items-center gap-3">
                          <span>{formatDate(p.created_at)}</span>
                          {status === "completed" && (
                            <span className="text-green-600 inline-flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {p.analysis?.total_area_sqm} מ&quot;ר
                            </span>
                          )}
                          {status === "processing" && (
                            <span className="text-blue-600 inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 animate-pulse" />
                              בעיבוד
                            </span>
                          )}
                          {status === "failed" && (
                            <span className="text-red-600 inline-flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              נכשל
                            </span>
                          )}
                          {!status && <span className="text-neutral-400">טרם נותח</span>}
                        </div>
                      </div>

                      {/* כפתור עריכת שם */}
                      {status === "completed" && p.analysis?.id && (
                        <Link href={`/dashboard/projects/${projectId}/boq/new?planAnalysisId=${p.analysis.id}`}>
                          <Button variant="outline" size="sm">
                            כתב מהתכנית
                          </Button>
                        </Link>
                      )}

                      {status && p.analysis?.id && (
                        <button
                          onClick={() => deletePlanAnalysis(p.analysis!.id!)}
                          className="text-neutral-400 hover:text-red-600 p-1"
                          title="מחק ניתוח בלבד"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* כפתור עריכת שם */}
                      {editingName !== p.id && (
                        <button
                          onClick={() => {
                            setEditingName(p.id);
                            setTempName(p.name);
                          }}
                          className="text-neutral-400 hover:text-[var(--color-brand-blue)] p-1"
                          title="ערוך שם"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* כפתור עריכת קטגוריה */}
                      {editingCategory === p.id ? (
                        <select
                          autoFocus
                          value={p.category}
                          onChange={(e) => changeCategory(p.id, e.target.value as PlanCategory)}
                          onBlur={() => setEditingCategory(null)}
                          className="text-xs h-8 rounded border border-neutral-300 px-1"
                        >
                          {(Object.keys(CATEGORIES) as PlanCategory[]).map((k) => (
                            <option key={k} value={k}>
                              {CATEGORIES[k].emoji} {CATEGORIES[k].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingCategory(p.id)}
                          className="text-neutral-400 hover:text-[var(--color-brand-blue)] p-1"
                          title="שנה קטגוריה"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => deletePlan(p.id)}
                        className="text-neutral-400 hover:text-red-600 p-1"
                        title="מחק"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <p className="text-xs text-neutral-500 mt-4 text-center">
          ניתוח של {selected.size} תכניות יעלה בערך ${(selected.size * 0.05).toFixed(2)}
        </p>
      )}
    </div>
  );
}
