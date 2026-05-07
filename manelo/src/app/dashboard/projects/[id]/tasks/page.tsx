import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TasksManager } from "@/components/tasks/tasks-manager";
import { ArrowRight, BarChart3 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectTasksPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, organization_id")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const [{ data: tasks }, { data: pros }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "*, assigned_to:contacts!assigned_to_contact_id(id, name, phone), checklist:task_checklist_items(id, description, is_done, display_order), comments:task_comments(id, author_type, author_name, body, attachments, created_at)"
      )
      .eq("project_id", id)
      .order("display_order"),
    supabase
      .from("contacts")
      .select("id, name, phone, profession")
      .eq("type", "professional")
      .order("name"),
  ]);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={`משימות · ${project.name}`}
        description="ניהול משימות הפרויקט - שיוך לבעלי מקצוע ומעקב התקדמות"
        action={
          <div className="flex gap-2">
            <Link href={`/dashboard/projects/${id}/gantt`}>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4" />
                לוח גאנט
              </Button>
            </Link>
            <Link href={`/dashboard/projects/${id}`}>
              <Button variant="outline" size="sm">
                <ArrowRight className="h-4 w-4" />
                לפרויקט
              </Button>
            </Link>
          </div>
        }
      />

      <TasksManager
        projectId={id}
        projectName={project.name}
        organizationId={project.organization_id}
        initialTasks={tasks || []}
        professionals={pros || []}
      />
    </div>
  );
}
