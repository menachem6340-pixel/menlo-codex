import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { BoqBulkTable } from "@/components/boq/boq-bulk-table";
import { Calculator, Upload } from "lucide-react";

export default async function BoqPage() {
  const supabase = await createClient();
  const { data: boqs } = await supabase
    .from("boqs")
    .select("*, project:projects(id, name, client:contacts(name))")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="כתבי כמויות"
        description="כל כתבי הכמויות של הפרויקטים במקום אחד"
        action={
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/boq/import">
              <Button variant="outline">
                <Upload className="h-4 w-4" />
                ייבוא דקל / בינארית
              </Button>
            </Link>
            <Link href="/dashboard/projects">
              <Button>
                <Calculator className="h-4 w-4" />
                צור מפרויקט
              </Button>
            </Link>
          </div>
        }
      />

      {!boqs || boqs.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="אין כתבי כמויות עדיין"
          description="אפשר ליצור כתב כמויות מתוך פרויקט, או לייבא קובץ דקל/בינארית."
          action={
            <div className="flex justify-center gap-2 flex-wrap">
              <Link href="/dashboard/boq/import">
                <Button variant="outline">
                  <Upload className="h-4 w-4" />
                  ייבוא קובץ
                </Button>
              </Link>
              <Link href="/dashboard/projects">
                <Button>
                  <Calculator className="h-4 w-4" />
                  לפרויקטים
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <Card>
          <BoqBulkTable
            boqs={boqs.map((boq) => {
              const project = firstRelation<{
                id: string;
                name: string;
                client?: { name: string } | { name: string }[] | null;
              }>(boq.project);
              const client = firstRelation<{ name: string }>(project?.client);

              return {
                id: boq.id,
                name: boq.name,
                total_amount: boq.total_amount,
                created_at: boq.created_at,
                project: project
                  ? {
                      id: project.id,
                      name: project.name,
                      client,
                    }
                  : null,
              };
            })}
          />
        </Card>
      )}
    </div>
  );
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
