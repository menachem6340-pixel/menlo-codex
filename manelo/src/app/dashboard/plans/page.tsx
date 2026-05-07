import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteRecordButton } from "@/components/actions/delete-record-button";
import { formatDate } from "@/lib/utils";
import { Eye, FileText, Sparkles } from "lucide-react";

export default async function PlansPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*, project:projects(name), analysis:plan_analyses(id, status, total_area_sqm)")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="תכניות"
        description="כל התכניות שניתחת - ארגון מרכזי לכל הפרויקטים"
      />

      {!plans || plans.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="אין תכניות עדיין"
          description="העלה תכנית מתוך פרויקט - מ'פרויקטים' → בחר פרויקט → 'העלה תכנית'"
          action={
            <Link href="/dashboard/projects">
              <Button>לפרויקטים</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => {
            const analyses = p.analysis as Array<{ id: string; status: string; total_area_sqm: number }> | null;
            const latestAnalysis = analyses?.[0];
            const project = p.project as { name: string } | null;
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow h-full p-5">
                <Link href={`/dashboard/plans/${p.id}`} className="block">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-12 w-12 shrink-0 rounded-lg bg-[var(--color-brand-yellow)]/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-[var(--color-brand-blue)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{p.name}</h3>
                      {project && (
                        <p className="text-xs text-neutral-500 truncate">{project.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">{formatDate(p.created_at)}</span>
                    {latestAnalysis?.status === "completed" && (
                      <span className="inline-flex items-center gap-1 text-[var(--color-brand-green)]">
                        <Sparkles className="h-3 w-3" />
                        {latestAnalysis.total_area_sqm} מ&quot;ר
                      </span>
                    )}
                    {latestAnalysis?.status === "processing" && (
                      <span className="text-[var(--color-brand-blue)]">מנתח...</span>
                    )}
                  </div>
                </Link>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-2 flex-wrap">
                  <Link href={`/dashboard/plans/${p.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                      פתיחה
                    </Button>
                  </Link>
                  {latestAnalysis?.id && (
                    <DeleteRecordButton
                      id={latestAnalysis.id}
                      type="plan_analysis"
                      label="מחק ניתוח"
                    />
                  )}
                  <DeleteRecordButton id={p.id} type="plan" label="מחק תכנית" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
