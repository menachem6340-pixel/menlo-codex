"use client";

import { use, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  ArrowRight,
  Upload,
  FileText,
  Sparkles,
  Link as LinkIcon,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react";
import { CATEGORIES, detectCategoryFromFilename, type PlanCategory } from "@/lib/plans/categories";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PendingFile {
  id: string;
  file?: File; // אם מקומי
  driveUrl?: string; // אם מ-Drive
  name: string;
  category: PlanCategory;
  status: "pending" | "uploading" | "extracting" | "done" | "error";
  errorMessage?: string;
  uploadedPlanId?: string;
  aiUsed?: boolean;
  aiConfidence?: "high" | "medium" | "low";
  aiDetails?: {
    plan_number?: string;
    designer?: string;
    company?: string;
    scale?: string;
    what_i_see?: string;
    category_reason?: string;
  };
}

function convertDriveLinkToDownload(url: string): string | null {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return `https://drive.google.com/uc?export=download&id=${trimmed}`;
  }
  const m1 = trimmed.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return `https://drive.google.com/uc?export=download&id=${m1[1]}`;
  const m2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return `https://drive.google.com/uc?export=download&id=${m2[1]}`;
  return null;
}

export default function UploadPlanPage({ params }: PageProps) {
  const { id: projectId } = use(params);

  const [mode, setMode] = useState<"file" | "drive">("file");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [driveInput, setDriveInput] = useState("");
  const [useAINaming, setUseAINaming] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newOnes: PendingFile[] = Array.from(files).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      name: f.name.replace(/\.[^.]+$/, ""),
      category: detectCategoryFromFilename(f.name),
      status: "pending",
    }));
    setPending((prev) => [...prev, ...newOnes]);
  }

  function addDriveUrls() {
    setGlobalError(null);
    const urls = driveInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) return;

    const newOnes: PendingFile[] = [];
    const errors: string[] = [];
    for (const url of urls) {
      if (/\/folders\//.test(url)) {
        errors.push(`תיקייה - לא נתמך: ${url.slice(0, 50)}...`);
        continue;
      }
      const dl = convertDriveLinkToDownload(url);
      if (!dl) {
        errors.push(`קישור לא תקין: ${url.slice(0, 50)}...`);
        continue;
      }
      newOnes.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        driveUrl: dl,
        name: "תכנית מ-Drive",
        category: "other",
        status: "pending",
      });
    }

    setPending((prev) => [...prev, ...newOnes]);
    setDriveInput("");
    if (errors.length > 0) setGlobalError(errors.join("\n"));
  }

  function removeFile(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  function updateFile(id: string, patch: Partial<PendingFile>) {
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function uploadAll() {
    setIsUploading(true);
    setGlobalError(null);

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .single();

    if (!profile?.organization_id) {
      setGlobalError("לא נמצא ארגון");
      setIsUploading(false);
      return;
    }

    // עבד את כל הקבצים במקביל (אבל מוגבל ל-3 בו-זמנית)
    const queue = [...pending.filter((p) => p.status === "pending")];
    const concurrency = 3;
    const inProgress = new Set<Promise<void>>();

    async function processOne(item: PendingFile) {
      try {
        updateFile(item.id, { status: "uploading" });

        let fileBlob: Blob;
        let fileType: "pdf" | "image";
        let ext: string;

        if (item.driveUrl) {
          const res = await fetch("/api/drive/fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: item.driveUrl }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "הורדה מ-Drive נכשלה");
          }
          fileBlob = await res.blob();
          ext = fileBlob.type.includes("pdf") ? "pdf" : "jpg";
          fileType = fileBlob.type.includes("pdf") ? "pdf" : "image";
        } else if (item.file) {
          fileBlob = item.file;
          ext = item.file.name.split(".").pop()?.toLowerCase() || "pdf";
          fileType = ext === "pdf" ? "pdf" : "image";
        } else {
          throw new Error("אין קובץ");
        }

        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const path = `${profile!.organization_id}/${projectId}/${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("PLANS")
          .upload(path, fileBlob, {
            contentType: fileBlob.type || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
          });

        if (uploadErr) throw new Error(uploadErr.message);

        const { data: urlData } = supabase.storage.from("PLANS").getPublicUrl(path);
        const fileUrl = urlData.publicUrl;

        let finalName = item.name;
        let finalCategory = item.category;

        let aiUsed = false;
        let aiConfidence: "high" | "medium" | "low" | undefined;
        let aiDetails: PendingFile["aiDetails"];

        if (useAINaming) {
          updateFile(item.id, { status: "extracting" });
          try {
            const aiRes = await fetch("/api/plans/extract-title", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileUrl,
                fileType,
                originalName: item.file?.name || item.name,
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              if (aiData.title) finalName = aiData.title;
              if (aiData.category) finalCategory = aiData.category;
              aiUsed = aiData.ai_used === true;
              aiConfidence = aiData.confidence;
              aiDetails = aiData.details;
            }
          } catch {
            // לא קריטי - נשתמש בשם המקורי
          }
        }

        const { data: plan, error: planErr } = await supabase
          .from("plans")
          .insert({
            organization_id: profile!.organization_id,
            project_id: projectId,
            name: finalName,
            file_url: fileUrl,
            file_type: fileType,
            file_size_kb: Math.round(fileBlob.size / 1024),
            category: finalCategory,
          })
          .select("id")
          .single();

        if (planErr || !plan) throw new Error(planErr?.message || "שמירה נכשלה");

        updateFile(item.id, {
          status: "done",
          name: finalName,
          category: finalCategory,
          uploadedPlanId: plan.id,
          aiUsed,
          aiConfidence,
          aiDetails,
        });
      } catch (e) {
        updateFile(item.id, {
          status: "error",
          errorMessage: e instanceof Error ? e.message : "שגיאה",
        });
      }
    }

    while (queue.length > 0 || inProgress.size > 0) {
      while (inProgress.size < concurrency && queue.length > 0) {
        const item = queue.shift()!;
        const p = processOne(item).finally(() => {
          inProgress.delete(p);
        });
        inProgress.add(p);
      }
      if (inProgress.size > 0) await Promise.race(inProgress);
    }

    setIsUploading(false);
  }

  const allDone = pending.length > 0 && pending.every((p) => p.status === "done");
  const anyPending = pending.some((p) => p.status === "pending");

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="העלאת תכניות"
        description="בחר כמה קבצים שתרצה - AI יזהה אוטומטית את שם התכנית ואת הקטגוריה מתוך הקובץ עצמו"
        action={
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה לפרויקט
            </Button>
          </Link>
        }
      />

      {/* בחירת מקור */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setMode("file")}
          className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
            mode === "file"
              ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10"
              : "border-neutral-200 hover:border-neutral-300 bg-white"
          }`}
        >
          <Upload className="h-4 w-4 inline ml-1" />
          העלאה מהמחשב
        </button>
        <button
          onClick={() => setMode("drive")}
          className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
            mode === "drive"
              ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10"
              : "border-neutral-200 hover:border-neutral-300 bg-white"
          }`}
        >
          <LinkIcon className="h-4 w-4 inline ml-1" />
          Google Drive
        </button>
      </div>

      {/* אזור הוספה */}
      <Card className="mb-4">
        <CardContent className="p-5">
          {mode === "file" ? (
            <label
              htmlFor="files-input"
              className="block border-2 border-dashed border-neutral-300 hover:border-[var(--color-brand-yellow)] rounded-xl p-6 text-center cursor-pointer transition-colors bg-neutral-50"
            >
              <Upload className="h-10 w-10 mx-auto mb-2 text-neutral-400" />
              <p className="font-medium">לחץ כדי לבחור קבצים</p>
              <p className="text-xs text-neutral-500 mt-1">
                ניתן לבחור <strong>כמה קבצים יחד</strong> (Ctrl/Shift + קליק)
                <br />
                PDF, JPG, PNG - עד 20MB לקובץ
              </p>
              <input
                id="files-input"
                type="file"
                multiple
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
                  קישורי Google Drive (אחד בכל שורה)
                </label>
                <textarea
                  rows={4}
                  dir="ltr"
                  value={driveInput}
                  onChange={(e) => setDriveInput(e.target.value)}
                  placeholder={"https://drive.google.com/file/d/.../view\nhttps://drive.google.com/file/d/.../view"}
                  className="w-full p-3 rounded-lg border border-neutral-300 focus:border-[var(--color-brand-yellow)] focus:outline-none text-right text-sm font-mono"
                />
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
                <strong>חשוב:</strong>
                <ul className="list-disc mr-5 mt-1 space-y-0.5">
                  <li>צריך קישור לכל <strong>קובץ בנפרד</strong> - תיקיות לא נתמכות</li>
                  <li>כל קובץ צריך להיות מוגדר &quot;Anyone with the link&quot;</li>
                  <li>אפשר להדביק כמה קישורים, כל אחד בשורה</li>
                </ul>
              </div>

              <Button onClick={addDriveUrls} disabled={!driveInput.trim()} variant="outline" className="w-full">
                הוסף קישורים לרשימה
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI naming toggle */}
      {pending.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useAINaming}
                onChange={(e) => setUseAINaming(e.target.checked)}
                className="h-5 w-5 mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--color-brand-blue)]" />
                  השתמש ב-AI לזיהוי שם וקטגוריה מתוך התכנית
                </div>
                <div className="text-xs text-neutral-600 mt-1">
                  AI יקרא את &quot;כותרת התכנית&quot; (title block בצד ימין) ויחלץ את השם האמיתי, מספר התכנית, וקנה המידה. עלות: ~$0.005 לקובץ.
                </div>
              </div>
            </label>
          </CardContent>
        </Card>
      )}

      {/* רשימת קבצים ממתינים */}
      {pending.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-0">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div className="font-semibold">
                {pending.length} קבצים{" "}
                {allDone && <span className="text-green-600 mr-2">✓ הכל הושלם</span>}
              </div>
              {!isUploading && pending.some((p) => p.status === "pending" || p.status === "error") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPending([])}
                >
                  נקה הכל
                </Button>
              )}
            </div>

            <div className="divide-y divide-neutral-100">
              {pending.map((p) => {
                const cat = CATEGORIES[p.category];
                return (
                  <div key={p.id} className="p-3 flex items-center gap-3">
                    <div className="shrink-0">
                      {p.status === "uploading" || p.status === "extracting" ? (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : p.status === "done" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : p.status === "error" ? (
                        <X className="h-5 w-5 text-red-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-neutral-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {p.status === "done" || p.status === "uploading" || p.status === "extracting" ? (
                        <div>
                          <div className="font-medium text-sm">{p.name}</div>
                          <div className="text-xs text-neutral-500">
                            {p.status === "uploading" && "מעלה..."}
                            {p.status === "extracting" && "✨ AI קורא את התכנית..."}
                            {p.status === "done" && (
                              <div className="space-y-0.5">
                                {p.aiUsed && p.aiConfidence && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded ${
                                        p.aiConfidence === "high"
                                          ? "bg-green-100 text-green-700"
                                          : p.aiConfidence === "medium"
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {p.aiConfidence === "high" && "✓ זוהה בביטחון גבוה"}
                                      {p.aiConfidence === "medium" && "⚠ זוהה בביטחון בינוני"}
                                      {p.aiConfidence === "low" && "⚠ זוהה בביטחון נמוך - בדוק"}
                                    </span>
                                    {p.aiDetails?.scale && <span>קנ״מ: {p.aiDetails.scale}</span>}
                                    {p.aiDetails?.designer && <span>מתכנן: {p.aiDetails.designer}</span>}
                                  </div>
                                )}
                                {!p.aiUsed && useAINaming && (
                                  <span className="text-yellow-600">
                                    ⚠ AI נכשל - השם לקוח מהקובץ
                                  </span>
                                )}
                                {p.aiDetails?.what_i_see && (
                                  <details className="cursor-pointer mt-1">
                                    <summary className="text-[var(--color-brand-blue)]">
                                      מה ה-AI ראה בתכנית?
                                    </summary>
                                    <p className="mt-1 text-neutral-600 italic">
                                      {p.aiDetails.what_i_see}
                                    </p>
                                  </details>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => updateFile(p.id, { name: e.target.value })}
                            className="h-9 px-2 rounded border border-neutral-300 text-sm focus:border-[var(--color-brand-yellow)] focus:outline-none"
                            placeholder="שם התכנית"
                          />
                          <select
                            value={p.category}
                            onChange={(e) => updateFile(p.id, { category: e.target.value as PlanCategory })}
                            className="h-9 px-2 rounded border border-neutral-300 text-sm focus:border-[var(--color-brand-yellow)] focus:outline-none"
                          >
                            {(Object.keys(CATEGORIES) as PlanCategory[]).map((k) => (
                              <option key={k} value={k}>
                                {CATEGORIES[k].emoji} {CATEGORIES[k].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {p.status === "error" && (
                        <div className="text-xs text-red-600 mt-1">{p.errorMessage}</div>
                      )}
                    </div>

                    <div className={`shrink-0 text-xs px-2 py-0.5 rounded border ${cat.color}`}>
                      {cat.emoji}
                    </div>

                    {p.status !== "uploading" && p.status !== "extracting" && (
                      <button
                        onClick={() => removeFile(p.id)}
                        className="text-neutral-400 hover:text-red-600 p-1"
                        title="הסר"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {globalError && (
              <div className="p-3 m-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 whitespace-pre-line">
                {globalError}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between gap-3">
            <div className="text-xs text-neutral-500">
              {useAINaming && anyPending && `עלות AI משוערת: $${(pending.length * 0.005).toFixed(3)}`}
            </div>
            <div className="flex gap-2">
              {allDone ? (
                <Link href={`/dashboard/projects/${projectId}`}>
                  <Button>סיימתי - חזור לפרויקט</Button>
                </Link>
              ) : (
                <Button
                  onClick={uploadAll}
                  disabled={isUploading || !anyPending}
                >
                  {isUploading ? "מעלה..." : `העלה ${pending.filter((p) => p.status === "pending").length} קבצים`}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
