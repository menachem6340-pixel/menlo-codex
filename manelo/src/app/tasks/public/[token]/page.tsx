import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicTaskUpdater } from "@/components/tasks/public-task-updater";
import { Calendar, User, Briefcase } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { MenloAppIcon } from "@/components/brand/menlo-app-icon";
import { APP_DEFAULT_ORG_NAME } from "@/lib/brand";

interface PageProps {
  params: Promise<{ token: string }>;
}

interface PublicTaskData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  progress_pct?: number | null;
  planned_start?: string | null;
  planned_end?: string | null;
  project?: { name: string; address?: string | null } | null;
  assigned_to?: { name: string; phone?: string | null } | null;
  organization?: { name: string } | null;
  checklist?: Array<{
    id: string;
    description: string;
    is_done: boolean;
    display_order: number;
  }>;
}

const RESPONSIBLE_PREFIX = "באחריות פנימית:";

function cleanDescription(description?: string | null) {
  return (description || "")
    .split("\n")
    .filter((line) => !line.trim().startsWith(RESPONSIBLE_PREFIX))
    .join("\n")
    .trim();
}

/**
 * דף ציבורי - בעל מקצוע יכול לראות את המשימה שלו ולעדכן התקדמות
 * בלי רישום - רק בעזרת ה-public_token
 */
export default async function PublicTaskPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: task } = await supabase.rpc("public_get_task", { p_token: token });

  if (!task) notFound();

  const publicTask = task as PublicTaskData;
  const project = publicTask.project;
  const assignedTo = publicTask.assigned_to;
  const org = publicTask.organization;
  const description = cleanDescription(publicTask.description);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-brand-yellow)]/15 via-neutral-50 to-[var(--color-brand-blue)]/10 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <MenloAppIcon
            className="mx-auto mb-2 h-20 w-20"
            title={org?.name || APP_DEFAULT_ORG_NAME}
          />
          <h1 className="text-xl font-bold text-[var(--color-brand-dark)]">משימה לביצוע</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="text-xs text-neutral-500 mb-1">
              {org?.name && <span>{org.name} · </span>}
              {project?.name}
            </div>
            <CardTitle>{publicTask.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {description && <p className="text-sm text-neutral-700 whitespace-pre-wrap">{description}</p>}

            <div className="grid grid-cols-2 gap-3 text-sm border-t border-neutral-200 pt-4">
              {assignedTo && (
                <div>
                  <div className="text-xs text-neutral-500 mb-1 inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    מבצע
                  </div>
                  <div className="font-medium">{assignedTo.name}</div>
                </div>
              )}
              {project?.address && (
                <div>
                  <div className="text-xs text-neutral-500 mb-1 inline-flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    אתר
                  </div>
                  <div className="font-medium">{project.address}</div>
                </div>
              )}
              {publicTask.planned_start && (
                <div>
                  <div className="text-xs text-neutral-500 mb-1 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    התחלה
                  </div>
                  <div className="font-medium">{formatDate(publicTask.planned_start)}</div>
                </div>
              )}
              {publicTask.planned_end && (
                <div>
                  <div className="text-xs text-neutral-500 mb-1 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    סיום
                  </div>
                  <div className="font-medium">{formatDate(publicTask.planned_end)}</div>
                </div>
              )}
            </div>

            <PublicTaskUpdater
              taskId={publicTask.id}
              token={token}
              currentStatus={publicTask.status}
              currentProgress={publicTask.progress_pct || 0}
              checklist={publicTask.checklist || []}
            />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-neutral-400 mt-6">
          קישור פרטי - לא לשתף · {org?.name || APP_DEFAULT_ORG_NAME}
        </p>
      </div>
    </div>
  );
}
