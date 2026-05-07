import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteRecordButton } from "@/components/actions/delete-record-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Plus } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "טיוטה", color: "bg-neutral-100 text-neutral-700" },
  sent: { label: "נשלח", color: "bg-blue-100 text-blue-700" },
  approved: { label: "אושר", color: "bg-green-100 text-green-700" },
  rejected: { label: "נדחה", color: "bg-red-100 text-red-700" },
  expired: { label: "פג תוקף", color: "bg-yellow-100 text-yellow-700" },
};

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*, client:contacts(name), project:projects(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="הצעות מחיר"
        description="כל הצעות המחיר במקום אחד"
        action={
          <Link href="/dashboard/quotes/new">
            <Button>
              <Plus className="h-4 w-4" />
              הצעה חדשה
            </Button>
          </Link>
        }
      />

      {!quotes || quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="אין הצעות מחיר עדיין"
          description="צור את הצעת המחיר הראשונה שלך - אפשר ידנית או מתוך פרויקט קיים"
          action={
            <Link href="/dashboard/quotes/new">
              <Button>
                <Plus className="h-4 w-4" />
                הצעה חדשה
              </Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/50">
                  <th className="text-right p-4 font-medium text-neutral-700">מספר</th>
                  <th className="text-right p-4 font-medium text-neutral-700">כותרת</th>
                  <th className="text-right p-4 font-medium text-neutral-700">לקוח</th>
                  <th className="text-right p-4 font-medium text-neutral-700">תאריך</th>
                  <th className="text-right p-4 font-medium text-neutral-700">סכום</th>
                  <th className="text-right p-4 font-medium text-neutral-700">סטטוס</th>
                  <th className="text-right p-4 font-medium text-neutral-700">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const status = statusConfig[q.status] || statusConfig.draft;
                  const client = q.client as { name: string } | null;
                  return (
                    <tr
                      key={q.id}
                      className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer last:border-0"
                    >
                      <td className="p-4 font-mono text-xs">
                        <Link href={`/dashboard/quotes/${q.id}`} className="block">
                          #{q.quote_number}
                        </Link>
                      </td>
                      <td className="p-4 font-medium">
                        <Link href={`/dashboard/quotes/${q.id}`} className="block">
                          {q.title}
                        </Link>
                      </td>
                      <td className="p-4">{client?.name || "—"}</td>
                      <td className="p-4 text-neutral-500">{formatDate(q.issue_date)}</td>
                      <td className="p-4 font-semibold text-[var(--color-brand-blue)]">
                        {formatCurrency(q.total_amount || 0)}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <DeleteRecordButton id={q.id} type="quote" compact />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
