"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";

interface ParsedContact {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  __selected?: boolean;
}

export default function WhatsAppImportPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    setError(null);
    setParsing(true);

    try {
      const res = await fetch("/api/contacts/parse-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "פענוח נכשל");

      setContacts(
        (data.contacts as ParsedContact[]).map((c) => ({ ...c, __selected: true }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setParsing(false);
    }
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

    const toInsert = contacts
      .filter((c) => c.__selected && c.name)
      .map((c) => ({
        type: "client" as const,
        organization_id: profile.organization_id,
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        city: c.city || null,
        notes: c.notes || "מקור: וואטסאפ",
      }));

    const { error: err } = await supabase.from("contacts").insert(toInsert);
    setImporting(false);

    if (err) {
      setError(err.message);
      return;
    }

    router.push("/dashboard/clients");
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="יבוא לקוחות מוואטסאפ"
        description="הדבק טקסט מוואטסאפ - AI יזהה לקוחות עם שם, טלפון וכתובת ויוסיף אותם"
        action={
          <Link href="/dashboard/clients">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
          </Link>
        }
      />

      {contacts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
              הדבק את הטקסט
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder={`הדבק כאן הודעות וואטסאפ עם פרטי לקוחות, לדוגמא:

[16:32, 26.4.2026] משה כהן: היי, יש לי דירה לשיפוץ ברחוב הרצל 12 רעננה
[16:35, 26.4.2026] משה כהן: אפשר להגיע מחר?
הטלפון שלי 050-1234567

[18:01, 26.4.2026] רותי: שלום, אני רותי לוי מירושלים
התפנה לי תקציב לשיפוץ המטבח. הטלפון: 052-9876543

ה-AI יבין את ההודעות וייצר רשימת לקוחות מסודרת.`}
              className="w-full p-4 rounded-lg border border-neutral-300 focus:border-[var(--color-brand-yellow)] focus:outline-none text-sm font-mono"
            />

            <div className="mt-4 rounded-lg bg-[var(--color-brand-yellow)]/10 border border-[var(--color-brand-yellow)]/30 p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-[var(--color-brand-blue)] shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>איך זה עובד:</strong> AI יקרא את הטקסט, יזהה אנשים שונים, ימשוך מהטקסט שמות, טלפונים, כתובות ואימיילים, ויציג לך רשימה מסודרת. אתה תאשר כל אחד לפני שהוא נכנס למערכת.
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleParse} disabled={parsing || !text.trim()}>
              <Sparkles className="h-4 w-4" />
              {parsing ? "AI מנתח..." : "נתח עם AI"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>נמצאו {contacts.length} לקוחות</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="p-2 w-10">
                    <input
                      type="checkbox"
                      checked={contacts.every((c) => c.__selected)}
                      onChange={(e) =>
                        setContacts((cs) =>
                          cs.map((c) => ({ ...c, __selected: e.target.checked }))
                        )
                      }
                    />
                  </th>
                  <th className="p-2 text-right font-medium">שם</th>
                  <th className="p-2 text-right font-medium">טלפון</th>
                  <th className="p-2 text-right font-medium">עיר</th>
                  <th className="p-2 text-right font-medium">כתובת</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={c.__selected}
                        onChange={(e) =>
                          setContacts((cs) => {
                            const n = [...cs];
                            n[i] = { ...n[i], __selected: e.target.checked };
                            return n;
                          })
                        }
                      />
                    </td>
                    <td className="p-2 font-medium">{c.name}</td>
                    <td className="p-2" dir="ltr">{c.phone || "—"}</td>
                    <td className="p-2">{c.city || "—"}</td>
                    <td className="p-2 text-neutral-600">{c.address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setContacts([])}>
              נסה שוב
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing
                ? "מייבא..."
                : `יבא ${contacts.filter((c) => c.__selected).length} לקוחות`}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
