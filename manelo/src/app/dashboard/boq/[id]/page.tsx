import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { BoqEditor } from "@/components/boq/boq-editor";
import { DeleteRecordButton } from "@/components/actions/delete-record-button";
import { ArrowRight, FileText } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoqDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: boq } = await supabase
    .from("boqs")
    .select("*, project:projects(id, name)")
    .eq("id", id)
    .single();

  if (!boq) notFound();

  const { data: sections } = await supabase
    .from("boq_sections")
    .select("*")
    .eq("boq_id", id)
    .order("display_order");

  const { data: items } = await supabase
    .from("boq_items")
    .select("*")
    .eq("boq_id", id)
    .order("display_order");

  const project = boq.project as { id: string; name: string } | null;
  const quoteHref = `/dashboard/quotes/new?boqId=${id}${project?.id ? `&projectId=${project.id}` : ""}`;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={boq.name}
        description={project ? `פרויקט: ${project.name}` : undefined}
        action={
          <div className="flex gap-2">
            {project && (
              <Link href={`/dashboard/projects/${project.id}`}>
                <Button variant="outline" size="sm">
                  <ArrowRight className="h-4 w-4" />
                  לפרויקט
                </Button>
              </Link>
            )}
            <Link href={quoteHref}>
              <Button size="sm">
                <FileText className="h-4 w-4" />
                צור הצעת מחיר
              </Button>
            </Link>
            <DeleteRecordButton
              id={id}
              type="boq"
              redirectTo={project ? `/dashboard/projects/${project.id}` : "/dashboard"}
            />
          </div>
        }
      />

      <BoqEditor
        boqId={id}
        projectId={project?.id}
        initialSections={sections || []}
        initialItems={items || []}
      />
    </div>
  );
}
