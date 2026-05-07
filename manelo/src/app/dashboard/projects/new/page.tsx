"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowRight } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    client_id: "",
    address: "",
    description: "",
    budget: "",
    start_date: "",
    end_date: "",
    status: "lead" as const,
  });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("type", "client")
        .order("name");
      setClients(data || []);
    })();
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .single();

    if (!profile?.organization_id) {
      setError("שגיאה: לא נמצא ארגון מקושר");
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        name: form.name,
        client_id: form.client_id || null,
        address: form.address || null,
        description: form.description || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        organization_id: profile.organization_id,
      })
      .select("id")
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/dashboard/projects/${data!.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="פרויקט חדש"
        description="פרטי הפרויקט - שם הפרויקט הוא היחיד החובה"
        action={
          <Link href="/dashboard/projects">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Input
              label="שם הפרויקט *"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="לדוגמא: וילה משפחת כהן - הרצליה"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  לקוח
                </label>
                <select
                  className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-[var(--color-brand-yellow)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]/30"
                  value={form.client_id}
                  onChange={(e) => update("client_id", e.target.value)}
                >
                  <option value="">— ללא לקוח / ליד —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <Link
                    href="/dashboard/clients/new"
                    className="text-xs text-[var(--color-brand-blue)] hover:underline mt-1 inline-block"
                  >
                    + הוסף לקוח חדש
                  </Link>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  סטטוס
                </label>
                <select
                  className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-[var(--color-brand-yellow)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]/30"
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  <option value="lead">ליד</option>
                  <option value="quoted">הצעת מחיר</option>
                  <option value="active">פעיל</option>
                  <option value="paused">מושהה</option>
                  <option value="completed">הושלם</option>
                </select>
              </div>

              <Input
                label="כתובת הפרויקט"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="כתובת האתר"
                className="md:col-span-2"
              />

              <Input
                label="תקציב משוער (₪)"
                type="number"
                step="0.01"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
                placeholder="0"
                dir="ltr"
                className="text-right"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="תאריך התחלה"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => update("start_date", e.target.value)}
                />
                <Input
                  label="תאריך סיום"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => update("end_date", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                תיאור הפרויקט
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base focus:border-[var(--color-brand-yellow)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]/30"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="תיאור קצר של היקף העבודה..."
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-3">
            <Link href="/dashboard/projects">
              <Button type="button" variant="outline">
                ביטול
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "שומר..." : "צור פרויקט"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
