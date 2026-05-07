"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowRight } from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    business_id: "",
    notes: "",
  });

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

    const { error: insertError } = await supabase.from("contacts").insert({
      ...form,
      type: "client",
      organization_id: profile.organization_id,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/dashboard/clients");
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="לקוח חדש"
        description="פרטי הלקוח - שם וטלפון מספיקים להתחלה, את השאר אפשר למלא בהמשך"
        action={
          <Link href="/dashboard/clients">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה לרשימה
            </Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="שם הלקוח / חברה *"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="לדוגמא: ישראל ישראלי"
              />
              <Input
                label="איש קשר (אם שונה)"
                value={form.contact_person}
                onChange={(e) => update("contact_person", e.target.value)}
                placeholder="שם איש הקשר"
              />
              <Input
                label="טלפון"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="050-1234567"
                dir="ltr"
                className="text-right"
              />
              <Input
                label="אימייל"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="example@mail.com"
                dir="ltr"
                className="text-right"
              />
              <Input
                label="כתובת"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="רחוב + מספר"
              />
              <Input
                label="עיר"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="ירושלים / תל אביב..."
              />
              <Input
                label="ח.פ. / ת.ז."
                value={form.business_id}
                onChange={(e) => update("business_id", e.target.value)}
                dir="ltr"
                className="text-right"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                הערות
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base focus:border-[var(--color-brand-yellow)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]/30"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="הערות חופשיות..."
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-3">
            <Link href="/dashboard/clients">
              <Button type="button" variant="outline">
                ביטול
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "שומר..." : "שמור לקוח"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
