"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator, Download, FileText, MessageCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface BoqRow {
  id: string;
  name: string;
  total_amount: number | string | null;
  created_at: string;
  project?: {
    id: string;
    name: string;
    client?: { name: string } | null;
  } | null;
}

interface BoqBulkTableProps {
  boqs: BoqRow[];
}

export function BoqBulkTable({ boqs }: BoqBulkTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedRows = useMemo(() => boqs.filter((boq) => selected.has(boq.id)), [boqs, selected]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => (current.size === boqs.length ? new Set() : new Set(boqs.map((boq) => boq.id))));
  }

  async function deleteSelected() {
    if (selectedRows.length === 0) return;
    if (!confirm(`למחוק ${selectedRows.length} כתבי כמויות? פעולה זו תמחק גם את הפרקים והשורות שלהם.`)) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("boqs").delete().in("id", selectedRows.map((boq) => boq.id));
    if (error) {
      alert(`המחיקה נכשלה: ${error.message}`);
      return;
    }

    setSelected(new Set());
    router.refresh();
  }

  function attachToQuote(ids = Array.from(selected)) {
    if (ids.length === 0) return;
    router.push(`/dashboard/quotes/new?boqIds=${encodeURIComponent(ids.join(","))}`);
  }

  function sendSelected() {
    if (selectedRows.length === 0) return;

    const baseUrl = window.location.origin;
    const logoLink = `${baseUrl}/logo-full.svg`;
    const lines = selectedRows.map((boq, index) => {
      const excelLink = `${baseUrl}/api/boq/${boq.id}/excel`;
      return `${index + 1}. ${boq.name} - ${formatCurrency(Number(boq.total_amount || 0))}\n${excelLink}`;
    });

    const message = `שלום,\n\nמצורפים כתבי כמויות ממנלו בנייה:\n\n${lines.join(
      "\n\n"
    )}\n\nלוגו מנלו:\n${logoLink}\n\nבברכה,\nמנלו בנייה`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div>
      {selectedRows.length > 0 && (
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-medium">
              נבחרו {selectedRows.length} כתבי כמויות
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={() => attachToQuote()}>
                <FileText className="h-4 w-4" />
                צרף להצעה
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={sendSelected}>
                <MessageCircle className="h-4 w-4" />
                שלח
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={deleteSelected}>
                <Trash2 className="h-4 w-4" />
                מחק
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: "940px" }}>
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/50">
              <th className="w-12 p-4 text-center">
                <input
                  type="checkbox"
                  checked={boqs.length > 0 && selected.size === boqs.length}
                  onChange={toggleAll}
                  className="h-4 w-4"
                  title="בחר הכל"
                />
              </th>
              <th className="text-right p-4 font-medium text-neutral-700">שם</th>
              <th className="text-right p-4 font-medium text-neutral-700">פרויקט</th>
              <th className="text-right p-4 font-medium text-neutral-700">לקוח</th>
              <th className="text-right p-4 font-medium text-neutral-700">תאריך</th>
              <th className="text-right p-4 font-medium text-neutral-700">סכום</th>
              <th className="text-right p-4 font-medium text-neutral-700">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {boqs.map((boq) => {
              const project = boq.project || null;
              const quoteHref = `/dashboard/quotes/new?boqId=${boq.id}${project?.id ? `&projectId=${project.id}` : ""}`;
              const checked = selected.has(boq.id);

              return (
                <tr
                  key={boq.id}
                  className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 ${
                    checked ? "bg-[var(--color-brand-yellow)]/10" : ""
                  }`}
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(boq.id)}
                      className="h-4 w-4"
                      title="בחר כתב כמויות"
                    />
                  </td>
                  <td className="p-4 font-medium">
                    <Link href={`/dashboard/boq/${boq.id}`} className="block">
                      {boq.name}
                    </Link>
                  </td>
                  <td className="p-4">
                    {project ? (
                      <Link href={`/dashboard/projects/${project.id}`} className="text-[var(--color-brand-blue)]">
                        {project.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-4">{project?.client?.name || "—"}</td>
                  <td className="p-4 text-neutral-500">{formatDate(boq.created_at)}</td>
                  <td className="p-4 font-semibold text-[var(--color-brand-blue)] ltr-numbers">
                    {formatCurrency(Number(boq.total_amount || 0))}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/boq/${boq.id}`}>
                        <Button variant="outline" size="sm">
                          פתיחה
                        </Button>
                      </Link>
                      <Link href={quoteHref}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4" />
                          הצעה
                        </Button>
                      </Link>
                      <a href={`/api/boq/${boq.id}/excel`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                          Excel
                        </Button>
                      </a>
                      <Button type="button" variant="outline" size="sm" onClick={() => attachToQuote([boq.id])}>
                        <Calculator className="h-4 w-4" />
                        צרף
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
