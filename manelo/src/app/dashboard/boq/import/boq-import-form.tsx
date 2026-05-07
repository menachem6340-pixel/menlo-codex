"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Upload } from "lucide-react";

interface ProjectOption {
  id: string;
  name: string;
  client_name?: string;
}

interface BoqImportFormProps {
  projects: ProjectOption[];
}

type ImportSource = "dekel" | "binarit";

export function BoqImportForm({ projects }: BoqImportFormProps) {
  const router = useRouter();
  const [source, setSource] = useState<ImportSource>("dekel");
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitImport(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("בחר קובץ לייבוא");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("source", source);
    formData.append("project_id", projectId);
    formData.append("name", name);
    formData.append("file", file);

    try {
      const response = await fetch("/api/boq/import", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "ייבוא נכשל");

      setSuccess(`יובאו ${result.rowsImported} שורות מתוך ${result.sectionsImported} פרקים`);
      router.push(`/dashboard/boq/${result.boqId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בייבוא");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submitImport} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>מקור הקובץ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SourceCard
              active={source === "dekel"}
              title="דקל"
              description="קובץ כתב כמויות/מחירון שיוצא מדקל בפורמט CSV או Excel."
              onClick={() => setSource("dekel")}
            />
            <SourceCard
              active={source === "binarit"}
              title="בינארית"
              description="קובץ כתב כמויות שיוצא מבינארית בפורמט CSV או Excel."
              onClick={() => setSource("binarit")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הייבוא</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">פרויקט</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-[var(--color-brand-yellow)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]/30"
            >
              <option value="">ללא שיוך לפרויקט</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                  {project.client_name ? ` · ${project.client_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="שם כתב הכמויות"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמא: כתב כמויות מדקל - פרויקט הרצל"
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">קובץ</label>
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center hover:border-[var(--color-brand-yellow)]">
              <FileSpreadsheet className="mb-3 h-9 w-9 text-[var(--color-brand-blue)]" />
              <span className="font-medium text-neutral-800">
                {file ? file.name : "בחר קובץ דקל / בינארית"}
              </span>
              <span className="mt-1 text-xs text-neutral-500">
                מומלץ לייצא מהתוכנה כ-CSV או XLSX. המערכת מזהה עמודות סעיף, תיאור, יחידה, כמות ומחיר.
              </span>
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xlsm"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            טיפ: אם הקובץ לא מזוהה, פתח אותו בדקל/בינארית וייצא מחדש ל-Excel או CSV עם כותרות עמודות.
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !file}>
          <Upload className="h-4 w-4" />
          {loading ? "מייבא..." : "ייבא ופתח כתב כמויות"}
        </Button>
      </div>
    </form>
  );
}

function SourceCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 p-4 text-right transition-colors ${
        active
          ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10"
          : "border-neutral-200 hover:border-neutral-300"
      }`}
    >
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{description}</p>
    </button>
  );
}
