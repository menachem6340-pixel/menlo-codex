import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Briefcase, Plus, MapPin } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  lead: { label: "ליד", color: "bg-neutral-100 text-neutral-700" },
  quoted: { label: "הצעת מחיר", color: "bg-blue-100 text-blue-700" },
  active: { label: "פעיל", color: "bg-green-100 text-green-700" },
  paused: { label: "מושהה", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "הושלם", color: "bg-purple-100 text-purple-700" },
  cancelled: { label: "בוטל", color: "bg-red-100 text-red-700" },
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*, client:contacts(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="פרויקטים"
        description="ניהול פרויקטים פעילים והיסטוריים"
        action={
          <Link href="/dashboard/projects/new">
            <Button>
              <Plus className="h-4 w-4" />
              פרויקט חדש
            </Button>
          </Link>
        }
      />

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="אין פרויקטים עדיין"
          description="צור את הפרויקט הראשון שלך כדי להתחיל לנהל תכניות, כתבי כמויות והצעות מחיר"
          action={
            <Link href="/dashboard/projects/new">
              <Button>
                <Plus className="h-4 w-4" />
                פרויקט חדש
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const status = statusConfig[p.status] || statusConfig.lead;
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-[var(--color-brand-dark)] truncate flex-1">
                      {p.name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {p.client && (
                    <p className="text-sm text-neutral-600 mb-2">
                      לקוח: {(p.client as { name: string }).name}
                    </p>
                  )}
                  {p.address && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-3">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.address}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm border-t border-neutral-200 pt-3 mt-3">
                    <span className="text-neutral-500">תקציב</span>
                    <span className="font-semibold text-[var(--color-brand-blue)]">
                      {p.budget ? formatCurrency(p.budget) : "—"}
                    </span>
                  </div>
                  {p.start_date && (
                    <div className="text-xs text-neutral-500 mt-2">
                      התחלה: {formatDate(p.start_date)}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
