"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, Calculator, CheckCircle2, Plus, Trash2 } from "lucide-react";

interface Item {
  included: boolean;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string | null;
}

interface SourceBoq {
  id: string;
  name: string;
  project_id: string | null;
  total_amount?: number | string | null;
  project?: Project | Project[] | null;
}

interface SourceBoqItem {
  boq_id?: string;
  description: string;
  unit: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  notes?: string | null;
  section?: { name: string } | Array<{ name: string }> | null;
}

type QuoteImportMode = "priced_items" | "quantities_only" | "lump_sum" | "section_totals";

const COMMON_UNITS = ["מ\"ר", "מ\"א", "מ\"ק", "יח'", "יום", "ק\"ג", "טון", "קומפלט"];

const IMPORT_MODES: Array<{ value: QuoteImportMode; label: string; description: string }> = [
  {
    value: "priced_items",
    label: "מפורט עם מחירים",
    description: "כל שורות כתב הכמויות, כולל כמויות ומחירי יחידה.",
  },
  {
    value: "quantities_only",
    label: "כמויות ללא מחירים",
    description: "כל השורות והכמויות ייכנסו, המחירים יישארו 0 לעריכה ידנית.",
  },
  {
    value: "section_totals",
    label: "מחיר לפי סעיפים",
    description: "שורה אחת לכל פרק/סעיף בכתב הכמויות עם סכום הסעיף.",
  },
  {
    value: "lump_sum",
    label: "פאושלי על הכל",
    description: "שורה אחת כוללת לכל כתבי הכמויות שנבחרו.",
  },
];

export function NewQuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetProjectId = searchParams.get("projectId");
  const presetClientId = searchParams.get("clientId");
  const presetBoqId = searchParams.get("boqId");
  const presetBoqIdsParam = searchParams.get("boqIds") || "";
  const presetPrimaryBoqId = presetBoqId || parseBoqIdsParam(presetBoqIdsParam)[0] || "";

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boqs, setBoqs] = useState<SourceBoq[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingBoq, setImportingBoq] = useState(false);
  const [importMode, setImportMode] = useState<QuoteImportMode>("priced_items");
  const [error, setError] = useState<string | null>(null);
  const [selectedBoqIds, setSelectedBoqIds] = useState<string[]>(
    uniqueBoqIds(
      presetBoqId ? [presetBoqId, ...parseBoqIdsParam(presetBoqIdsParam)] : parseBoqIdsParam(presetBoqIdsParam)
    )
  );

  const [form, setForm] = useState({
    title: "",
    client_id: presetClientId || "",
    project_id: presetProjectId || "",
    boq_id: presetPrimaryBoqId,
    payment_terms: "30% מקדמה, 40% בשלד, 30% סיום",
    notes: "",
    discount_pct: 0,
    vat_rate: 18,
    valid_days: 30,
  });

  const [items, setItems] = useState<Item[]>([createBlankItem()]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [c, p, b] = await Promise.all([
        supabase.from("contacts").select("id, name").eq("type", "client").order("name"),
        supabase.from("projects").select("id, name, client_id").order("created_at", { ascending: false }),
        supabase
          .from("boqs")
          .select("id, name, project_id, total_amount, project:projects(id, name, client_id)")
          .order("created_at", { ascending: false }),
      ]);
      const loadedProjects = p.data || [];
      setClients(c.data || []);
      setProjects(loadedProjects);
      setBoqs((b.data || []) as SourceBoq[]);

      if (presetProjectId && !presetClientId) {
        const selectedProject = loadedProjects.find((project) => project.id === presetProjectId);
        if (selectedProject?.client_id) {
          setForm((current) => ({ ...current, client_id: selectedProject.client_id || current.client_id }));
        }
      }

      const initialBoqIds = parseBoqIdsParam(presetBoqIdsParam);
      if (presetBoqId && !initialBoqIds.includes(presetBoqId)) {
        initialBoqIds.unshift(presetBoqId);
      }

      if (initialBoqIds.length > 0) {
        const [{ data: boq }, { data: boqItems }] = await Promise.all([
          supabase
            .from("boqs")
            .select("id, name, project_id, project:projects(id, name, client_id)")
            .in("id", initialBoqIds),
          supabase
            .from("boq_items")
            .select("boq_id, description, unit, quantity, unit_price, notes, section:boq_sections(name)")
            .in("boq_id", initialBoqIds)
            .order("display_order"),
        ]);

        const sourceBoqs = (boq || []) as SourceBoq[];
        const orderedBoqs = initialBoqIds
          .map((id) => sourceBoqs.find((sourceBoq) => sourceBoq.id === id))
          .filter(Boolean) as SourceBoq[];
        if (orderedBoqs.length > 0) {
          applyBoqData(orderedBoqs, (boqItems || []) as SourceBoqItem[], "priced_items");
        }
      }
    })();
  }, [presetBoqId, presetBoqIdsParam, presetClientId, presetProjectId]);

  function applyBoqData(sourceBoqs: SourceBoq[], sourceItems: SourceBoqItem[], mode: QuoteImportMode) {
    const firstBoq = sourceBoqs[0];
    const sourceProject = firstRelation<Project>(firstBoq?.project);
    const boqIds = sourceBoqs.map((boq) => boq.id);

    setSelectedBoqIds(boqIds);

    setForm((current) => ({
      ...current,
      boq_id: firstBoq?.id || current.boq_id,
      project_id: firstBoq?.project_id || current.project_id,
      client_id: sourceProject?.client_id || current.client_id,
      title: current.title || `הצעת מחיר - ${sourceProject?.name || firstBoq?.name || "כתב כמויות"}`,
    }));

    const quoteItems = buildQuoteItemsFromBoqs(sourceBoqs, sourceItems, mode);
    setItems(quoteItems.length > 0 ? quoteItems : [createBlankItem()]);
  }

  function toggleSelectedBoq(boqId: string) {
    setSelectedBoqIds((current) =>
      current.includes(boqId) ? current.filter((id) => id !== boqId) : [...current, boqId]
    );
  }

  function selectAllAvailableBoqs() {
    setSelectedBoqIds((current) =>
      current.filter((id) => availableBoqs.some((boq) => boq.id === id)).length === availableBoqs.length
        ? []
        : availableBoqs.map((boq) => boq.id)
    );
  }

  async function importBoqsToQuote(boqIds: string[]) {
    const ids = Array.from(new Set(boqIds.filter(Boolean)));
    if (ids.length === 0) {
      update("boq_id", "");
      return;
    }

    const hasExistingRows = items.some((item) => item.description.trim());
    if (hasExistingRows && !confirm("להחליף את שורות ההצעה בשורות מכתב הכמויות שבחרת?")) {
      return;
    }

    setError(null);
    setImportingBoq(true);

    try {
      const supabase = createClient();
      const [{ data: selectedBoqs, error: boqError }, { data: boqItems, error: itemsError }] = await Promise.all([
        supabase
          .from("boqs")
          .select("id, name, project_id, total_amount, project:projects(id, name, client_id)")
          .in("id", ids),
        supabase
          .from("boq_items")
          .select("boq_id, description, unit, quantity, unit_price, notes, section:boq_sections(name)")
          .in("boq_id", ids)
          .order("display_order"),
      ]);

      if (boqError || !selectedBoqs?.length) throw new Error(boqError?.message || "כתב הכמויות לא נמצא");
      if (itemsError) throw new Error(itemsError.message);

      const orderedBoqs = ids
        .map((id) => (selectedBoqs as SourceBoq[]).find((boq) => boq.id === id))
        .filter(Boolean) as SourceBoq[];
      applyBoqData(orderedBoqs, (boqItems || []) as SourceBoqItem[], importMode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינת כתב הכמויות");
    } finally {
      setImportingBoq(false);
    }
  }

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateItem<K extends keyof Item>(index: number, key: K, value: Item[K]) {
    setItems((arr) => {
      const next = [...arr];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  function addItem() {
    setItems((a) => [...a, createBlankItem()]);
  }

  function removeItem(i: number) {
    setItems((a) => (a.length > 1 ? a.filter((_, idx) => idx !== i) : a));
  }

  function setAllItemsIncluded(included: boolean) {
    setItems((arr) => arr.map((item) => ({ ...item, included })));
  }

  // חישובים
  const includedItems = items.filter((item) => item.included);
  const allItemsIncluded = items.length > 0 && includedItems.length === items.length;
  const subtotal = includedItems.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const discountAmount = (subtotal * form.discount_pct) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = (afterDiscount * form.vat_rate) / 100;
  const total = afterDiscount + vatAmount;
  const availableBoqs = form.project_id
    ? boqs.filter((boq) => boq.project_id === form.project_id)
    : boqs;
  const effectiveSelectedBoqIds = selectedBoqIds.filter((id) =>
    availableBoqs.some((boq) => boq.id === id)
  );
  const selectedSourceBoqs = availableBoqs.filter((boq) => effectiveSelectedBoqIds.includes(boq.id));
  const selectedSourceTotal = selectedSourceBoqs.reduce(
    (sum, boq) => sum + Number(boq.total_amount || 0),
    0
  );

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

      // הפק מספר הצעה
      const { data: quoteNumber } = await supabase.rpc("next_quote_number", {
        org_id: profile.organization_id,
      });

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + form.valid_days);

      const { data: quote, error: qErr } = await supabase
        .from("quotes")
        .insert({
          organization_id: profile.organization_id,
          client_id: form.client_id || null,
          project_id: form.project_id || null,
          boq_id: form.boq_id || null,
          quote_number: quoteNumber!,
          title: form.title,
          status: "draft",
          valid_until: validUntil.toISOString().slice(0, 10),
          discount_pct: form.discount_pct,
          vat_rate: form.vat_rate,
          payment_terms: form.payment_terms,
          notes: form.notes,
        })
        .select("id")
        .single();

      if (qErr || !quote) throw new Error(qErr?.message || "שמירה נכשלה");

      // שמור פריטים
      const validItems = items.filter((i) => i.included && i.description.trim());
      if (validItems.length > 0) {
        const { error: itemErr } = await supabase.from("quote_items").insert(
          validItems.map((it, idx) => ({
            quote_id: quote.id,
            display_order: idx,
            description: it.description,
            unit: it.unit,
            quantity: it.quantity,
            unit_price: it.unit_price,
            notes: it.notes,
          }))
        );
        if (itemErr) throw new Error(itemErr.message);
      }

      router.push(`/dashboard/quotes/${quote.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="הצעת מחיר חדשה"
        description="בנה הצעת מחיר עם פריטים, מחירים, וסכומים אוטומטיים"
        action={
          <Link href="/dashboard/quotes">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* פרטי ההצעה */}
        <Card>
          <CardHeader>
            <CardTitle>פרטי ההצעה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="כותרת ההצעה *"
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="לדוגמא: שיפוץ דירת 4 חדרים - רחוב הרצל 12"
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
                  <option value="">— בחר לקוח —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  פרויקט
                </label>
                <select
                  className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-[var(--color-brand-yellow)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]/30"
                  value={form.project_id}
                  onChange={(e) => {
                    const projectId = e.target.value;
                    const selectedProject = projects.find((project) => project.id === projectId);
                    const nextAvailableBoqs = projectId
                      ? boqs.filter((boq) => boq.project_id === projectId)
                      : boqs;
                    const nextSelectedBoqIds = selectedBoqIds.filter((id) =>
                      nextAvailableBoqs.some((boq) => boq.id === id)
                    );
                    setSelectedBoqIds(nextSelectedBoqIds);
                    setForm((current) => ({
                      ...current,
                      project_id: projectId,
                      client_id: selectedProject?.client_id || current.client_id,
                      boq_id:
                        current.boq_id &&
                        nextAvailableBoqs.some((boq) => boq.id === current.boq_id)
                          ? current.boq_id
                          : nextSelectedBoqIds[0] || "",
                    }));
                  }}
                >
                  <option value="">— ללא פרויקט —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700">
                <Calculator className="h-4 w-4 text-[var(--color-brand-blue)]" />
                הוספת כתב כמויות להצעה
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3">
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-neutral-600">
                      בחר כתב אחד או כמה כתבי כמויות שייכנסו להצעת המחיר
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={availableBoqs.length === 0}
                      onClick={selectAllAvailableBoqs}
                    >
                      {effectiveSelectedBoqIds.length === availableBoqs.length ? "נקה בחירה" : "בחר הכל"}
                    </Button>
                  </div>
                  {availableBoqs.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-300 p-3 text-sm text-neutral-500">
                      אין כתבי כמויות זמינים כרגע לפרויקט שנבחר.
                    </div>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {availableBoqs.map((boq) => {
                        const checked = effectiveSelectedBoqIds.includes(boq.id);
                        return (
                          <button
                            key={boq.id}
                            type="button"
                            onClick={() => {
                              toggleSelectedBoq(boq.id);
                              update("boq_id", boq.id);
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-right transition-all ${
                              checked
                                ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/10"
                                : "border-neutral-200 bg-white hover:border-neutral-300"
                            }`}
                          >
                            <input type="checkbox" checked={checked} readOnly className="h-4 w-4 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-neutral-800">{boq.name}</div>
                              <div className="mt-1 text-xs text-neutral-500">
                                {boq.total_amount ? formatCurrency(Number(boq.total_amount)) : "ללא סכום מחושב"}
                              </div>
                            </div>
                            {checked && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <select
                  className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-[var(--color-brand-yellow)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]/30"
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as QuoteImportMode)}
                >
                  {IMPORT_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-neutral-500">
                  {IMPORT_MODES.find((mode) => mode.value === importMode)?.description}
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-xs text-neutral-600 border border-neutral-200">
                  נבחרו {selectedSourceBoqs.length} כתבי כמויות · סכום מקור {formatCurrency(selectedSourceTotal)}
                </div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Button
                  type="button"
                  disabled={effectiveSelectedBoqIds.length === 0 || importingBoq}
                  onClick={() => importBoqsToQuote(effectiveSelectedBoqIds)}
                >
                  <Calculator className="h-4 w-4" />
                  {importingBoq
                    ? "מוסיף..."
                    : effectiveSelectedBoqIds.length > 1
                      ? `הוסף ${effectiveSelectedBoqIds.length} כתבי כמויות`
                      : "הוסף כתב כמויות"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={availableBoqs.length === 0 || importingBoq}
                  onClick={() => importBoqsToQuote(availableBoqs.map((boq) => boq.id))}
                >
                  הוסף את כל כתבי הכמויות בפרויקט
                </Button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                אפשר לעבוד עם כתב אחד, עם כמה כתבים ביחד, או עם כל כתבי הכמויות של הפרויקט לפי מצב התמחור שבחרת.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* פריטים */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>פריטים</span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={() => setAllItemsIncluded(true)}>
                  סמן הכל
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAllItemsIncluded(false)}>
                  נקה הכל
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4" />
                  שורה
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-neutral-500">
              רק שורות מסומנות יישמרו בהצעה וייכנסו לסכומים. אפשר להשאיר שורות לא מסומנות לבדיקה בלי למחוק אותן.
            </p>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm" style={{ minWidth: "780px" }}>
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-center py-2 px-2 font-medium w-14">
                      <input
                        type="checkbox"
                        checked={allItemsIncluded}
                        onChange={(e) => setAllItemsIncluded(e.target.checked)}
                        className="h-4 w-4"
                        title="סמן או בטל את כל הסעיפים"
                      />
                    </th>
                    <th className="text-right py-2 px-2 font-medium">תיאור</th>
                    <th className="text-right py-2 px-2 font-medium w-20">יחידה</th>
                    <th className="text-right py-2 px-2 font-medium w-24">כמות</th>
                    <th className="text-right py-2 px-2 font-medium w-28">מחיר ליח&apos;</th>
                    <th className="text-right py-2 px-2 font-medium w-28">סה&quot;כ</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                    return (
                      <tr
                        key={i}
                        className={`border-b border-neutral-100 ${
                          item.included ? "" : "bg-neutral-50 text-neutral-400"
                        }`}
                      >
                        <td className="py-1.5 px-2 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={(e) => updateItem(i, "included", e.target.checked)}
                            className="h-4 w-4"
                            title={item.included ? "הסעיף ייכנס להצעה" : "הסעיף לא ייכנס להצעה"}
                          />
                        </td>
                        <td className="py-1.5 px-1">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(i, "description", e.target.value)}
                            placeholder="תיאור הפריט"
                            className="w-full h-9 px-2 rounded border border-neutral-200 focus:border-[var(--color-brand-yellow)] focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-1">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(i, "unit", e.target.value)}
                            className="w-full h-9 px-1 rounded border border-neutral-200 focus:border-[var(--color-brand-yellow)] focus:outline-none text-sm"
                          >
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity || ""}
                            onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                            className="w-full h-9 px-2 rounded border border-neutral-200 focus:border-[var(--color-brand-yellow)] focus:outline-none ltr-numbers text-right"
                          />
                        </td>
                        <td className="py-1.5 px-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price || ""}
                            onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                            className="w-full h-9 px-2 rounded border border-neutral-200 focus:border-[var(--color-brand-yellow)] focus:outline-none ltr-numbers text-right"
                          />
                        </td>
                        <td className={`py-1.5 px-2 font-medium ltr-numbers ${item.included ? "" : "line-through"}`}>
                          {item.included ? formatCurrency(lineTotal) : formatCurrency(0)}
                        </td>
                        <td className="py-1.5 px-1">
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="text-neutral-400 hover:text-red-600 p-1"
                            title="מחק"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* סיכום */}
        <Card>
          <CardHeader>
            <CardTitle>סיכום ותנאים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="הנחה (%)"
                  type="number"
                  step="0.5"
                  value={form.discount_pct || ""}
                  onChange={(e) => update("discount_pct", parseFloat(e.target.value) || 0)}
                  dir="ltr"
                  className="text-right"
                />
                <Input
                  label="מע״מ (%)"
                  type="number"
                  step="0.5"
                  value={form.vat_rate}
                  onChange={(e) => update("vat_rate", parseFloat(e.target.value) || 0)}
                  dir="ltr"
                  className="text-right"
                />
                <Input
                  label="תוקף ההצעה (ימים)"
                  type="number"
                  value={form.valid_days}
                  onChange={(e) => update("valid_days", parseInt(e.target.value) || 30)}
                  dir="ltr"
                  className="text-right"
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    תנאי תשלום
                  </label>
                  <textarea
                    rows={2}
                    value={form.payment_terms}
                    onChange={(e) => update("payment_terms", e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[var(--color-brand-yellow)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    הערות / תנאים מיוחדים
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[var(--color-brand-yellow)] focus:outline-none"
                    placeholder="לדוגמא: לא כולל אגרות / היתרי בנייה / ..."
                  />
                </div>
              </div>

              <div className="bg-gradient-to-br from-[var(--color-brand-yellow)]/10 to-[var(--color-brand-blue)]/5 rounded-xl p-5 border border-neutral-200">
                <h3 className="font-semibold mb-4">סיכום סכומים</h3>
                <div className="space-y-2 text-sm">
                  <Row label="סה״כ פריטים" value={formatCurrency(subtotal)} />
                  {form.discount_pct > 0 && (
                    <Row
                      label={`הנחה (${form.discount_pct}%)`}
                      value={`-${formatCurrency(discountAmount)}`}
                      muted
                    />
                  )}
                  <Row label="לפני מע״מ" value={formatCurrency(afterDiscount)} />
                  <Row label={`מע״מ (${form.vat_rate}%)`} value={formatCurrency(vatAmount)} muted />
                  <div className="border-t-2 border-neutral-300 mt-3 pt-3 flex justify-between font-bold text-lg">
                    <span>סה״כ לתשלום</span>
                    <span className="text-[var(--color-brand-blue)] ltr-numbers">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mt-4">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-3">
            <Link href="/dashboard/quotes">
              <Button type="button" variant="outline">ביטול</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "שומר..." : "שמור הצעת מחיר"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function parseBoqIdsParam(value: string): string[] {
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function uniqueBoqIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

function createBlankItem(): Item {
  return { included: true, description: "", unit: "מ\"ר", quantity: 0, unit_price: 0 };
}

function buildQuoteItemsFromBoqs(
  sourceBoqs: SourceBoq[],
  sourceItems: SourceBoqItem[],
  mode: QuoteImportMode
): Item[] {
  const boqById = new Map(sourceBoqs.map((boq) => [boq.id, boq]));
  const shouldPrefixBoq = sourceBoqs.length > 1;

  if (mode === "lump_sum") {
    const total = sourceItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
      0
    );
    return [
      {
        included: true,
        description: `עבודות לפי ${sourceBoqs.length > 1 ? "כתבי כמויות" : "כתב כמויות"}: ${sourceBoqs
          .map((boq) => boq.name)
          .join(", ")}`,
        unit: "קומפלט",
        quantity: 1,
        unit_price: total,
      },
    ];
  }

  if (mode === "section_totals") {
    const grouped = new Map<string, { description: string; total: number; boqOrder: number }>();

    sourceItems.forEach((item) => {
      const boq = item.boq_id ? boqById.get(item.boq_id) : sourceBoqs[0];
      const section = firstRelation<{ name: string }>(item.section)?.name || "ללא סעיף";
      const key = `${boq?.id || "boq"}-${section}`;
      const current = grouped.get(key);
      const total = Number(item.quantity || 0) * Number(item.unit_price || 0);
      const boqOrder = sourceBoqs.findIndex((candidate) => candidate.id === boq?.id);

      if (current) {
        current.total += total;
      } else {
        grouped.set(key, {
          description: `${shouldPrefixBoq && boq ? `${boq.name} - ` : ""}${section}`,
          total,
          boqOrder: boqOrder === -1 ? 999 : boqOrder,
        });
      }
    });

    return Array.from(grouped.values())
      .sort((a, b) => a.boqOrder - b.boqOrder)
      .map((group) => ({
        included: true,
        description: group.description,
        unit: "קומפלט",
        quantity: 1,
        unit_price: group.total,
      }));
  }

  return sourceItems.map((item) => {
    const boq = item.boq_id ? boqById.get(item.boq_id) : sourceBoqs[0];
    return {
      included: true,
      description: `${shouldPrefixBoq && boq ? `${boq.name} - ` : ""}${item.description}`,
      unit: item.unit,
      quantity: Number(item.quantity || 0),
      unit_price: mode === "quantities_only" ? 0 : Number(item.unit_price || 0),
      notes: item.notes || undefined,
    };
  });
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-neutral-600" : ""}`}>
      <span>{label}</span>
      <span className="ltr-numbers">{value}</span>
    </div>
  );
}
