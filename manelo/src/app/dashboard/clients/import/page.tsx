"use client";

import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowRight, Upload, Check, AlertCircle, Download } from "lucide-react";

interface ParsedRow {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  business_id?: string;
  notes?: string;
  __error?: string;
  __selected?: boolean;
}

const FIELD_MAP: Record<string, keyof ParsedRow> = {
  // עברית
  "שם": "name",
  "שם לקוח": "name",
  "שם מלא": "name",
  "לקוח": "name",
  "איש קשר": "contact_person",
  "טלפון": "phone",
  "נייד": "phone",
  "פלאפון": "phone",
  "אימייל": "email",
  "מייל": "email",
  "דוא\"ל": "email",
  "כתובת": "address",
  "עיר": "city",
  "ח.פ.": "business_id",
  "ח״פ": "business_id",
  "ת.ז.": "business_id",
  "הערות": "notes",
  // English
  "name": "name",
  "fullname": "name",
  "client": "name",
  "phone": "phone",
  "mobile": "phone",
  "email": "email",
  "address": "address",
  "city": "city",
  "company": "name",
  "notes": "notes",
};

export default function ImportClientsPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ added: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "utf-8",
      complete: (results) => {
        const fields = results.meta.fields || [];
        // מפה את שמות העמודות לשדות שלנו
        const fieldMap = new Map<string, keyof ParsedRow>();
        for (const f of fields) {
          const normalized = f.trim().toLowerCase();
          const mapped = FIELD_MAP[normalized] || FIELD_MAP[f.trim()];
          if (mapped) fieldMap.set(f, mapped);
        }

        if (![...fieldMap.values()].includes("name")) {
          setError(
            "לא נמצאה עמודת 'שם' בקובץ. וודא שיש עמודה בשם: שם / שם לקוח / Name"
          );
          return;
        }

        const parsed: ParsedRow[] = (results.data as Record<string, string>[]).map((r) => {
          const row: ParsedRow = { name: "", __selected: true };
          for (const [src, dst] of fieldMap) {
            const value = (r[src] || "").trim();
            if (value) (row as unknown as Record<string, unknown>)[dst] = value;
          }
          if (!row.name) row.__error = "חסר שם";
          return row;
        });

        setRows(parsed);
      },
      error: (err) => setError(`שגיאת קריאה: ${err.message}`),
    });
  }

  function downloadTemplate() {
    const csv = `שם,איש קשר,טלפון,אימייל,כתובת,עיר,ח.פ.,הערות
ישראל ישראלי,,050-1234567,israel@example.com,רחוב הרצל 1,תל אביב,123456789,
חברת בנייה דוגמא בע"מ,משה כהן,03-1234567,info@example.co.il,יגאל אלון 75,תל אביב,514321987,לקוח VIP`;
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "תבנית-לקוחות.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    setImporting(true);
    setError(null);

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .single();

    if (!profile?.organization_id) {
      setError("לא נמצא ארגון");
      setImporting(false);
      return;
    }

    const toInsert = rows
      .filter((r) => r.__selected && !r.__error)
      .map((r) => ({
        type: "client" as const,
        organization_id: profile.organization_id,
        name: r.name,
        contact_person: r.contact_person || null,
        phone: r.phone || null,
        email: r.email || null,
        address: r.address || null,
        city: r.city || null,
        business_id: r.business_id || null,
        notes: r.notes || null,
      }));

    if (toInsert.length === 0) {
      setError("אין לקוחות נבחרים לייבוא");
      setImporting(false);
      return;
    }

    // הכנס ב-batches של 100
    let added = 0;
    let failed = 0;
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error: insertErr } = await supabase.from("contacts").insert(batch);
      if (insertErr) {
        failed += batch.length;
      } else {
        added += batch.length;
      }
    }

    setDone({ added, failed });
    setImporting(false);
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-green)] text-white">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">היבוא הושלם!</h2>
            <p className="text-neutral-600 mb-6">
              נוספו <strong>{done.added}</strong> לקוחות בהצלחה
              {done.failed > 0 && ` (${done.failed} נכשלו)`}
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/dashboard/clients">
                <Button>לרשימת הלקוחות</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setDone(null);
                  setRows([]);
                }}
              >
                יבוא קובץ נוסף
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="יבוא לקוחות מקובץ"
        description="העלה קובץ Excel/CSV ותקבל את כל הלקוחות בלחיצה אחת"
        action={
          <Link href="/dashboard/clients">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <label
              htmlFor="csv-file"
              className="block border-2 border-dashed border-neutral-300 hover:border-[var(--color-brand-yellow)] rounded-xl p-12 text-center cursor-pointer transition-colors bg-neutral-50"
            >
              <Upload className="h-12 w-12 mx-auto mb-3 text-neutral-400" />
              <p className="font-medium text-lg mb-1">לחץ לבחירת קובץ</p>
              <p className="text-sm text-neutral-500">CSV, Excel (.xlsx ייצוא ל-CSV מ-Excel)</p>
              <input
                id="csv-file"
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>

            <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h3 className="font-semibold mb-2 text-blue-900">איך זה עובד?</h3>
              <ol className="text-sm text-blue-900 space-y-1 list-decimal mr-5">
                <li>הורד תבנית CSV או הכן קובץ עם עמודות: שם, טלפון, אימייל וכו&apos;</li>
                <li>אם יש לך Excel - File → Save As → CSV UTF-8</li>
                <li>העלה כאן ותראה תצוגה מקדימה</li>
                <li>סמן את הלקוחות שתרצה לייבא ולחץ &quot;יבא&quot;</li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4" />
                הורד תבנית CSV
              </Button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>תצוגה מקדימה ({rows.length} שורות)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="p-2 text-right w-10">
                    <input
                      type="checkbox"
                      checked={rows.every((r) => r.__selected)}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((r) => ({ ...r, __selected: e.target.checked }))
                        )
                      }
                    />
                  </th>
                  <th className="p-2 text-right font-medium">שם</th>
                  <th className="p-2 text-right font-medium">טלפון</th>
                  <th className="p-2 text-right font-medium">אימייל</th>
                  <th className="p-2 text-right font-medium">עיר</th>
                  <th className="p-2 text-right font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={r.__selected}
                        disabled={!!r.__error}
                        onChange={(e) =>
                          setRows((rs) => {
                            const next = [...rs];
                            next[i] = { ...next[i], __selected: e.target.checked };
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className="p-2 font-medium">{r.name || "—"}</td>
                    <td className="p-2" dir="ltr">{r.phone || "—"}</td>
                    <td className="p-2" dir="ltr">{r.email || "—"}</td>
                    <td className="p-2">{r.city || "—"}</td>
                    <td className="p-2">
                      {r.__error ? (
                        <span className="text-red-600 text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {r.__error}
                        </span>
                      ) : (
                        <span className="text-green-600 text-xs">✓ מוכן</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          <CardFooter className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setRows([]);
                setError(null);
              }}
            >
              קובץ אחר
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing
                ? "מייבא..."
                : `יבא ${rows.filter((r) => r.__selected && !r.__error).length} לקוחות`}
            </Button>
          </CardFooter>
        </Card>
      )}

      {error && rows.length > 0 && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
