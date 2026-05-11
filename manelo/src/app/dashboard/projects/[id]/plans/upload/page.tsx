"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, FileText, Link as LinkIcon, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CATEGORIES, detectCategoryFromFilename, type PlanCategory } from "@/lib/plans/categories";
import {
  fileExtensionFromNameOrType,
  formatStorageError,
  uniqueStorageFileName,
} from "@/lib/storage/safe-path";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PendingFile {
  id: string;
  file?: File;
  driveUrl?: string;
  name: string;
  category: PlanCategory;
  status: "pending" | "uploading" | "extracting" | "done" | "error";
  errorMessage?: string;
  uploadedPlanId?: string;
}

function convertDriveLinkToDownload(url: string): string | null {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return `https://drive.google.com/uc?export=download&id=${trimmed}`;
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
    setPending((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name.replace(/\.[^.]+$/, ""),
        category: detectCategoryFromFilename(file.name),
        status: "pending" as const,
      })),
    ]);
  }

  function addDriveUrls() {
    const urls = driveInput.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
    const items: PendingFile[] = [];
    const errors: string[] = [];

    for (const url of urls) {
      if (/\/folders\//.test(url)) {
        errors.push("קישור לתיקייה לא נתמך כרגע. צריך קישור לכל קובץ בנפרד.");
        continue;
      }
      const downloadUrl = convertDriveLinkToDownload(url);
      if (!downloadUrl) {
        errors.push(`קישור לא תקין: ${url.slice(0, 60)}`);
        continue;
      }
      items.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        driveUrl: downloadUrl,
        name: "תכנית מ-Drive",
        category: "other",
        status: "pending",
      });
    }

    setPending((prev) => [...prev, ...items]);
    setDriveInput("");
    setGlobalError(errors.length ? errors.join("\n") : null);
  }

  function updateFile(id: string, patch: Partial<PendingFile>) {
    setPending((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadAll() {
    setIsUploading(true);
    setGlobalError(null);

    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("organization_id").single();
    if (!profile?.organization_id) {
      setGlobalError("לא נמצא ארגון");
      setIsUploading(false);
      return;
    }

    for (const item of pending.filter((entry) => entry.status === "pending" || entry.status === "error")) {
      try {
        updateFile(item.id, { status: "uploading", errorMessage: undefined });

        let fileBlob: Blob;
        let originalName = item.file?.name || item.name || "plan.pdf";

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
          originalName = item.name;
        } else if (item.file) {
          fileBlob = item.file;
        } else {
          throw new Error("אין קובץ להעלאה");
        }

        const ext = fileExtensionFromNameOrType(originalName, fileBlob.type);
        const fileType: "pdf" | "image" = ext === "pdf" || fileBlob.type.includes("pdf") ? "pdf" : "image";
        const safeName = uniqueStorageFileName(originalName, fileBlob.type);
        const path = `${profile.organization_id}/${projectId}/plans/${safeName}`;

        const { error: uploadErr } = await supabase.storage.from("PLANS").upload(path, fileBlob, {
          contentType: fileBlob.type || (fileType === "pdf" ? "application/pdf" : "image/jpeg"),
          upsert: false,
        });
        if (uploadErr) throw new Error(formatStorageError(uploadErr.message));

        const { data: urlData } = supabase.storage.from("PLANS").getPublicUrl(path);
        let finalName = item.name;
        let finalCategory = item.category;

        if (useAINaming) {
          updateFile(item.id, { status: "extracting" });
          const aiRes = await fetch("/api/plans/extract-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl: urlData.publicUrl, fileType, originalName }),
          }).catch(() => null);
          if (aiRes?.ok) {
            const aiData = await aiRes.json().catch(() => ({}));
            if (aiData.title) finalName = aiData.title;
            if (aiData.category) finalCategory = aiData.category;
          }
        }

        const { data: plan, error: planErr } = await supabase
          .from("plans")
          .insert({
            organization_id: profile.organization_id,
            project_id: projectId,
            name: finalName,
            file_url: urlData.publicUrl,
            file_type: fileType,
            file_size_kb: Math.round(fileBlob.size / 1024),
            category: finalCategory,
          })
          .select("id")
          .single();

        if (planErr || !plan) throw new Error(planErr?.message || "שמירה נכשלה");
        updateFile(item.id, { status: "done", name: finalName, category: finalCategory, uploadedPlanId: plan.id });
      } catch (error) {
        updateFile(item.id, {
          status: "error",
          errorMessage: error instanceof Error ? error.message : "שגיאה בהעלאה",
        });
      }
    }

    setIsUploading(false);
  }

  const allDone = pending.length > 0 && pending.every((item) => item.status === "done");
  const hasUploadable = pending.some((item) => item.status === "pending" || item.status === "error");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="העלאת תכניות"
        description="בחר קבצי PDF או תמונות. המערכת שומרת אותם בשם פנימי בטוח ומזהה את שם התכנית אם ה-AI פעיל."
        action={
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה לפרויקט
            </Button>
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button onClick={() => setMode("file")} className={`rounded-lg border-2 p-3 text-sm font-medium ${mode === "file" ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10" : "border-neutral-200 bg-white"}`}>
          <Upload className="ml-1 inline h-4 w-4" />
          העלאה מהמחשב
        </button>
        <button onClick={() => setMode("drive")} className={`rounded-lg border-2 p-3 text-sm font-medium ${mode === "drive" ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10" : "border-neutral-200 bg-white"}`}>
          <LinkIcon className="ml-1 inline h-4 w-4" />
          Google Drive
        </button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-5">
          {mode === "file" ? (
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center hover:border-[var(--color-brand-yellow)]">
              <Upload className="mx-auto mb-2 h-10 w-10 text-neutral-400" />
              <p className="font-medium">לחץ כדי לבחור קבצים</p>
              <p className="mt-1 text-xs text-neutral-500">PDF, JPG, PNG. אפשר לבחור כמה קבצים יחד.</p>
              <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
            </label>
          ) : (
            <div className="space-y-3">
              <textarea dir="ltr" rows={4} value={driveInput} onChange={(event) => setDriveInput(event.target.value)} placeholder="https://drive.google.com/file/d/.../view" className="w-full rounded-lg border border-neutral-300 p-3 text-right text-sm font-mono" />
              <Button onClick={addDriveUrls} disabled={!driveInput.trim()} variant="outline" className="w-full">הוסף קישורים לרשימה</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={useAINaming} onChange={(event) => setUseAINaming(event.target.checked)} />
                זיהוי שם וקטגוריה בעזרת AI
              </label>
              <Button variant="outline" size="sm" onClick={() => setPending([])} disabled={isUploading}>נקה הכל</Button>
            </div>

            <div className="divide-y divide-neutral-100">
              {pending.map((item) => {
                const category = CATEGORIES[item.category];
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3">
                    <div className="shrink-0">
                      {item.status === "uploading" || item.status === "extracting" ? <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> : item.status === "done" ? <CheckCircle className="h-5 w-5 text-green-600" /> : item.status === "error" ? <X className="h-5 w-5 text-red-600" /> : <FileText className="h-5 w-5 text-neutral-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      {item.status === "pending" || item.status === "error" ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input value={item.name} onChange={(event) => updateFile(item.id, { name: event.target.value })} className="h-9 rounded border border-neutral-300 px-2 text-sm" />
                          <select value={item.category} onChange={(event) => updateFile(item.id, { category: event.target.value as PlanCategory })} className="h-9 rounded border border-neutral-300 px-2 text-sm">
                            {(Object.keys(CATEGORIES) as PlanCategory[]).map((key) => <option key={key} value={key}>{CATEGORIES[key].emoji} {CATEGORIES[key].label}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-neutral-500">{item.status === "uploading" ? "מעלה..." : item.status === "extracting" ? "AI קורא את התכנית..." : "הושלם"}</div>
                        </div>
                      )}
                      {item.errorMessage && <div className="mt-1 text-xs text-red-600">{item.errorMessage}</div>}
                    </div>
                    <div className={`shrink-0 rounded border px-2 py-0.5 text-xs ${category.color}`}>{category.emoji}</div>
                    {!isUploading && item.status !== "done" && <button onClick={() => setPending((prev) => prev.filter((entry) => entry.id !== item.id))} className="p-1 text-neutral-400 hover:text-red-600"><X className="h-4 w-4" /></button>}
                  </div>
                );
              })}
            </div>

            {globalError && <div className="m-4 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{globalError}</div>}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            {allDone ? (
              <Link href={`/dashboard/projects/${projectId}`}><Button>סיימתי - חזור לפרויקט</Button></Link>
            ) : (
              <Button onClick={uploadAll} disabled={isUploading || !hasUploadable}>{isUploading ? "מעלה..." : "העלה קבצים"}</Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
