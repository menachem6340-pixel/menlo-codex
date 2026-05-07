"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronUp, Download, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Section {
  id: string;
  name: string;
  display_order: number;
}

interface Item {
  id: string;
  boq_id: string;
  section_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  display_order: number;
}

interface Props {
  boqId: string;
  projectId?: string;
  initialSections: Section[];
  initialItems: Item[];
}

export function BoqEditor({ boqId, projectId, initialSections, initialItems }: Props) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [items, setItems] = useState(initialItems);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  const supabase = createClient();

  // קבץ פריטים לפי פרק
  const itemsBySection = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const item of items) {
      const key = item.section_id || "unsection";
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const vat = subtotal * 0.18;
    return { subtotal, vat, total: subtotal + vat };
  }, [items]);

  function toggleSection(sectionId: string) {
    setCollapsedSections((s) => {
      const n = new Set(s);
      if (n.has(sectionId)) n.delete(sectionId);
      else n.add(sectionId);
      return n;
    });
  }

  async function updateItem(itemId: string, field: keyof Item, value: string | number) {
    setSaving(itemId);
    const numericFields = ["quantity", "unit_price"];
    const finalValue = numericFields.includes(field) ? Number(value) || 0 : value;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const updated = { ...it, [field]: finalValue };
        if (numericFields.includes(field)) {
          updated.total_price = (updated.quantity || 0) * (updated.unit_price || 0);
        }
        return updated;
      })
    );

    await supabase.from("boq_items").update({ [field]: finalValue }).eq("id", itemId);
    setSaving(null);
  }

  async function addItem(sectionId: string | null) {
    const maxOrder = items.filter((i) => i.section_id === sectionId).length;
    const { data } = await supabase
      .from("boq_items")
      .insert({
        boq_id: boqId,
        section_id: sectionId,
        description: "",
        unit: "מ\"ר",
        quantity: 0,
        unit_price: 0,
        display_order: maxOrder,
      })
      .select("*")
      .single();
    if (data) setItems((prev) => [...prev, data]);
  }

  async function deleteItem(itemId: string) {
    if (!confirm("למחוק שורה?")) return;
    await supabase.from("boq_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function addSection() {
    const name = prompt("שם הפרק:");
    if (!name) return;
    const { data } = await supabase
      .from("boq_sections")
      .insert({
        boq_id: boqId,
        name,
        display_order: sections.length,
      })
      .select("*")
      .single();
    if (data) setSections((prev) => [...prev, data]);
  }

  async function deleteSection(sectionId: string) {
    if (!confirm("למחוק את הפרק וכל הפריטים בתוכו?")) return;
    await supabase.from("boq_sections").delete().eq("id", sectionId);
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setItems((prev) => prev.filter((i) => i.section_id !== sectionId));
  }

  async function deleteBoq() {
    if (!confirm("למחוק את כתב הכמויות? כל הפריטים יימחקו לצמיתות.")) return;
    await supabase.from("boqs").delete().eq("id", boqId);
    if (projectId) router.push(`/dashboard/projects/${projectId}`);
    else router.push("/dashboard");
  }

  function exportToCSV() {
    const lines = ["פרק,תיאור,יחידה,כמות,מחיר ליחידה,סה\"כ"];
    for (const section of sections) {
      const sectionItems = itemsBySection[section.id] || [];
      for (const item of sectionItems) {
        const row = [
          section.name,
          item.description,
          item.unit,
          item.quantity,
          item.unit_price,
          item.total_price,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
        lines.push(row);
      }
    }
    lines.push("");
    lines.push(`,,,,"סה""כ ללא מע""מ",${totals.subtotal}`);
    lines.push(`,,,,"מע""מ 18%",${totals.vat}`);
    lines.push(`,,,,"סה""כ כולל מע""מ",${totals.total}`);

    const csv = "﻿" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `כתב-כמויות-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-neutral-600">
          {items.length} שורות · {sections.length} פרקים
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="danger" size="sm" onClick={deleteBoq}>
            <Trash2 className="h-4 w-4" />
            מחק
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} title="ייצוא פשוט ל-CSV">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <a href={`/api/boq/${boqId}/excel`}>
            <Button size="sm" variant="secondary">
              <FileSpreadsheet className="h-4 w-4" />
              יצוא Excel מעוצב
            </Button>
          </a>
          <Button size="sm" onClick={addSection}>
            <Plus className="h-4 w-4" />
            פרק חדש
          </Button>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {sections.map((section) => {
          const sectionItems = (itemsBySection[section.id] || []).sort((a, b) => a.display_order - b.display_order);
          const sectionTotal = sectionItems.reduce((s, i) => s + (i.total_price || 0), 0);
          const collapsed = collapsedSections.has(section.id);

          return (
            <Card key={section.id}>
              <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection(section.id)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {collapsed ? (
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-neutral-400" />
                    )}
                    <span className="font-semibold">{section.name}</span>
                    <span className="text-xs text-neutral-500">({sectionItems.length})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--color-brand-blue)]">
                      {formatCurrency(sectionTotal)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSection(section.id);
                      }}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>

              {!collapsed && (
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: "650px" }}>
                      <thead>
                        <tr className="border-b border-neutral-200 bg-neutral-50/50 text-xs">
                          <th className="text-right py-2 px-2 font-medium w-10">#</th>
                          <th className="text-right py-2 px-2 font-medium">תיאור</th>
                          <th className="text-right py-2 px-2 font-medium w-20">יחידה</th>
                          <th className="text-right py-2 px-2 font-medium w-24">כמות</th>
                          <th className="text-right py-2 px-2 font-medium w-28">מחיר ליח&apos;</th>
                          <th className="text-right py-2 px-2 font-medium w-28">סה&quot;כ</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionItems.map((item, i) => (
                          <tr key={item.id} className="border-b border-neutral-100">
                            <td className="py-1.5 px-2 text-xs text-neutral-500">{i + 1}</td>
                            <td className="py-1.5 px-1">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                className="w-full h-8 px-2 rounded border border-neutral-200 focus:border-[var(--color-brand-yellow)] focus:outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                                className="w-full h-8 px-2 rounded border border-neutral-200 focus:border-[var(--color-brand-yellow)] focus:outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                step="0.01"
                                value={item.quantity || ""}
                                onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                                className="w-full h-8 px-2 rounded border border-neutral-200 focus:border-[var(--color-brand-yellow)] focus:outline-none ltr-numbers text-right"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_price || ""}
                                onChange={(e) => updateItem(item.id, "unit_price", e.target.value)}
                                className="w-full h-8 px-2 rounded border border-neutral-200 focus:border-[var(--color-brand-yellow)] focus:outline-none ltr-numbers text-right"
                              />
                            </td>
                            <td className="py-1.5 px-2 ltr-numbers font-medium">
                              {formatCurrency(item.total_price || 0)}
                            </td>
                            <td className="py-1.5 px-1">
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="text-neutral-400 hover:text-red-600 p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-2 border-t border-neutral-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addItem(section.id)}
                      className="w-full text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      הוסף שורה
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* סיכום */}
      <Card className="bg-gradient-to-br from-[var(--color-brand-yellow)]/10 to-[var(--color-brand-blue)]/5">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">סיכום</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>סה״כ ללא מע״מ</span>
              <span className="ltr-numbers font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>מע״מ 18%</span>
              <span className="ltr-numbers">{formatCurrency(totals.vat)}</span>
            </div>
            <div className="border-t-2 border-neutral-300 pt-2 flex justify-between font-bold text-lg">
              <span>סה״כ כולל מע״מ</span>
              <span className="text-[var(--color-brand-blue)] ltr-numbers">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {saving && (
        <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600">
          שומר...
        </div>
      )}
    </div>
  );
}
