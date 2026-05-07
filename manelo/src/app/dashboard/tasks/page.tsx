import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { Briefcase, Calendar, ListTodo, Plus, User } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: "טרם התחיל", color: "bg-neutral-100 text-neutral-700" },
  in_progress: { label: "בביצוע", color: "bg-blue-100 text-blue-700" },
  blocked: { label: "חסום", color: "bg-orange-100 text-orange-700" },
  completed: { label: "הושלם", color: "bg-green-100 text-green-700" },
  cancelled: { label: "בוטל", color: "bg-red-100 text-red-700" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "נמוכה", color: "text-neutral-500" },
  medium: { label: "רגילה", color: "text-neutral-600" },
  high: { label: "גבוהה", color: "text-orange-600" },
  critical: { label: "קריטית", color: "text-red-600" },
};

export default async function TasksPage() {
  const supabase = await createClient();
  const [{ data: tasks }, { data: firstProject }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, planned_start, planned_end, progress_pct, project:projects(id, name), assigned_to:contacts!assigned_to_contact_id(name, profession)"
      )
      .order("updated_at", { ascending: false }),
    supabase.from("projects").select("id").order("created_at", { ascending: false }).limit(1).single(),
  ]);

  const firstProjectId = firstProject?.id;
  const openCount = (tasks || []).filter((task) =>
    ["not_started", "in_progress", "blocked"].includes(task.status)
  ).length;
  const completedCount = (tasks || []).filter((task) => task.status === "completed").length;
  const averageProgress = tasks?.length
    ? Math.round(
        tasks.reduce((sum, task) => sum + (task.status === "completed" ? 100 : Number(task.progress_pct || 0)), 0) /
          tasks.length
      )
    : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="משימות"
        description="כל משימות הפרויקטים במקום אחד"
        action={
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/projects">
              <Button variant="outline" size="sm">
                <Briefcase className="h-4 w-4" />
                בחר פרויקט
              </Button>
            </Link>
            <Link href="/dashboard/projects/new">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                פרויקט חדש
              </Button>
            </Link>
            <Link href={firstProjectId ? `/dashboard/projects/${firstProjectId}/tasks` : "/dashboard/projects/new"}>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                משימה חדשה
              </Button>
            </Link>
          </div>
        }
      />

      {!tasks || tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="עדיין אין משימות"
          description="משימות נוצרות מתוך פרויקט. פתח פרויקט, הוסף משימות חופשיות או ייבא תבנית ביצוע."
          action={
            <Link href={firstProjectId ? `/dashboard/projects/${firstProjectId}/tasks` : "/dashboard/projects/new"}>
              <Button>
                <Plus className="h-4 w-4" />
                התחל ממשימות פרויקט
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <TaskMetric label="סה״כ משימות" value={tasks.length} />
            <TaskMetric label="פתוחות" value={openCount} />
            <TaskMetric label="הושלמו" value={completedCount} />
            <TaskMetric
              label="התקדמות ממוצעת"
              value={averageProgress}
              suffix="%"
            />
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    <th className="text-right p-4 font-medium text-neutral-700">משימה</th>
                    <th className="text-right p-4 font-medium text-neutral-700">פרויקט</th>
                    <th className="text-right p-4 font-medium text-neutral-700">גורם מטפל</th>
                    <th className="text-right p-4 font-medium text-neutral-700">יעד</th>
                    <th className="text-right p-4 font-medium text-neutral-700">עדיפות</th>
                    <th className="text-right p-4 font-medium text-neutral-700">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const project = firstRelation<{ id: string; name: string }>(task.project);
                    const assigned = firstRelation<{ name: string; profession?: string | null }>(task.assigned_to);
                    const status = statusConfig[task.status] || statusConfig.not_started;
                    const priority = priorityConfig[task.priority] || priorityConfig.medium;
                    const taskHref = project ? `/dashboard/projects/${project.id}/tasks` : "/dashboard/tasks";

                    return (
                      <tr
                        key={task.id}
                        className="border-b border-neutral-100 hover:bg-neutral-50 last:border-0"
                      >
                        <td className="p-4">
                          <Link href={taskHref} className="block font-medium">
                            {task.title}
                          </Link>
                          <div className="text-xs text-neutral-500 mt-1">
                            התקדמות: {task.status === "completed" ? 100 : Number(task.progress_pct || 0)}%
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-brand-green)]"
                              style={{
                                width: `${task.status === "completed" ? 100 : Number(task.progress_pct || 0)}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="p-4">
                          {project ? (
                            <Link
                              href={`/dashboard/projects/${project.id}`}
                              className="inline-flex items-center gap-1 text-[var(--color-brand-blue)] hover:underline"
                            >
                              <Briefcase className="h-3.5 w-3.5" />
                              {project.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-4">
                          {assigned ? (
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {assigned.name}
                            </span>
                          ) : (
                            "לא שויך"
                          )}
                        </td>
                        <td className="p-4 text-neutral-600">
                          {task.planned_end ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(task.planned_end)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={`p-4 font-medium ${priority.color}`}>{priority.label}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function TaskMetric({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <Card className="p-5">
      <div className="text-2xl font-bold text-[var(--color-brand-dark)] ltr-numbers">
        {value}
        {suffix}
      </div>
      <div className="text-sm text-neutral-600">{label}</div>
    </Card>
  );
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
