"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  File,
  FileAudio,
  FileVideo,
  Link as LinkIcon,
  MessageCircle,
  Paperclip,
  Plus,
  Save,
  Sparkles,
  Square,
  Trash2,
  User,
  Calendar,
} from "lucide-react";
import { PROJECT_STAGES } from "@/lib/tasks/templates";

interface ChecklistItem {
  id: string;
  description: string;
  is_done: boolean;
  display_order: number;
}

interface Professional {
  id: string;
  name: string;
  phone?: string | null;
  profession?: string | null;
}

interface TaskAttachment {
  url: string;
  type?: string;
  name?: string;
}

interface TaskComment {
  id: string;
  author_type: string;
  author_name?: string | null;
  body: string;
  attachments?: TaskAttachment[] | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status: string;
  priority: string;
  is_critical?: boolean;
  planned_start?: string | null;
  planned_end?: string | null;
  estimated_duration_days?: number | null;
  progress_pct?: number | null;
  display_order: number;
  public_token?: string | null;
  assigned_to_contact_id?: string | null;
  assigned_to?: { id: string; name: string; phone?: string | null } | null;
  checklist?: ChecklistItem[];
  comments?: TaskComment[];
  completed_at?: string | null;
}

interface NewTaskFormState {
  title: string;
  category: string;
  description: string;
  responsible: string;
  assigned_to_contact_id: string;
  priority: string;
  planned_start: string;
  planned_end: string;
}

interface CommentDraft {
  body: string;
  files: File[];
}

interface Props {
  projectId: string;
  projectName: string;
  organizationId: string;
  initialTasks: Task[];
  professionals: Professional[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: "טרם התחיל", color: "bg-neutral-100 text-neutral-700" },
  in_progress: { label: "בביצוע", color: "bg-blue-100 text-blue-700" },
  blocked: { label: "חסום", color: "bg-orange-100 text-orange-700" },
  completed: { label: "בוצע", color: "bg-green-100 text-green-700" },
  cancelled: { label: "בוטל", color: "bg-red-100 text-red-700" },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "נמוכה",
  medium: "רגילה",
  high: "גבוהה",
  critical: "קריטית",
};

const RESPONSIBLE_PREFIX = "באחריות פנימית:";

function cleanDescription(description?: string | null) {
  return (description || "")
    .split("\n")
    .filter((line) => !line.trim().startsWith(RESPONSIBLE_PREFIX))
    .join("\n")
    .trim();
}

function extractResponsible(description?: string | null) {
  const line = (description || "")
    .split("\n")
    .find((item) => item.trim().startsWith(RESPONSIBLE_PREFIX));
  return line ? line.replace(RESPONSIBLE_PREFIX, "").trim() : "";
}

function buildDescription(description: string, responsible: string) {
  const parts = [description.trim()];
  if (responsible.trim()) parts.push(`${RESPONSIBLE_PREFIX} ${responsible.trim()}`);
  return parts.filter(Boolean).join("\n") || null;
}

function progressValue(task: Task) {
  if (task.status === "completed") return 100;
  return Math.max(0, Math.min(100, Number(task.progress_pct || 0)));
}

function safeFileName(name: string) {
  return name
    .replace(/[^\w.\-\u0590-\u05ff]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function isImageAttachment(attachment: TaskAttachment) {
  return Boolean(attachment.type?.startsWith("image/")) || /\.(png|jpe?g|webp|gif)$/i.test(attachment.url);
}

function isVideoAttachment(attachment: TaskAttachment) {
  return Boolean(attachment.type?.startsWith("video/")) || /\.(mp4|mov|webm|m4v)$/i.test(attachment.url);
}

function isAudioAttachment(attachment: TaskAttachment) {
  return Boolean(attachment.type?.startsWith("audio/")) || /\.(mp3|m4a|wav|ogg|aac)$/i.test(attachment.url);
}

export function TasksManager({
  projectId,
  projectName,
  organizationId,
  initialTasks,
  professionals,
}: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, CommentDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<NewTaskFormState>({
    title: "",
    category: "",
    description: "",
    responsible: "",
    assigned_to_contact_id: "",
    priority: "medium",
    planned_start: "",
    planned_end: "",
  });

  const supabase = createClient();

  function updateNewTask<K extends keyof NewTaskFormState>(field: K, value: NewTaskFormState[K]) {
    setNewTask((prev) => ({ ...prev, [field]: value }));
  }

  function resetNewTaskForm() {
    setNewTask({
      title: "",
      category: "",
      description: "",
      responsible: "",
      assigned_to_contact_id: "",
      priority: "medium",
      planned_start: "",
      planned_end: "",
    });
  }

  function updateCommentDraft(taskId: string, patch: Partial<CommentDraft>) {
    setCommentDrafts((prev) => {
      const current = prev[taskId] || { body: "", files: [] };
      return { ...prev, [taskId]: { ...current, ...patch } };
    });
  }

  function toggleExpand(taskId: string) {
    setExpandedTasks((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  async function importStage(stageName: string) {
    setError(null);
    setImporting(true);
    const stage = PROJECT_STAGES.find((item) => item.name === stageName);
    if (!stage) return;

    try {
      const startOrder = tasks.length;
      const insertedTasks: Task[] = [];

      for (let i = 0; i < stage.tasks.length; i++) {
        const templateTask = stage.tasks[i];
        const { data: insertedTask, error: insertError } = await supabase
          .from("tasks")
          .insert({
            organization_id: organizationId,
            project_id: projectId,
            title: templateTask.title,
            description: templateTask.description,
            category: templateTask.category,
            estimated_duration_days: templateTask.estimated_days,
            display_order: startOrder + i,
            status: "not_started",
            progress_pct: 0,
          })
          .select(
            "*, assigned_to:contacts!assigned_to_contact_id(id, name, phone), checklist:task_checklist_items(id, description, is_done, display_order), comments:task_comments(id, author_type, author_name, body, attachments, created_at)"
          )
          .single();

        if (insertError) throw new Error(insertError.message);
        if (!insertedTask) continue;

        if (templateTask.checklist && templateTask.checklist.length > 0) {
          await supabase.from("task_checklist_items").insert(
            templateTask.checklist.map((checklistItem, index) => ({
              task_id: insertedTask.id,
              description: checklistItem,
              display_order: index,
            }))
          );
        }

        insertedTasks.push({
          ...insertedTask,
          checklist:
            templateTask.checklist?.map((checklistItem, index) => ({
              id: `tmp-${insertedTask.id}-${index}`,
              description: checklistItem,
              is_done: false,
              display_order: index,
            })) || [],
          comments: [],
        });
      }

      setTasks((prev) => [...prev, ...insertedTasks]);
      setShowTemplates(false);
      router.refresh();
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : "שגיאה בייבוא תבנית");
    } finally {
      setImporting(false);
    }
  }

  async function importAllStages() {
    const totalTemplateTasks = PROJECT_STAGES.reduce((sum, stage) => sum + stage.tasks.length, 0);
    if (!confirm(`לייבא ${totalTemplateTasks} משימות סטנדרטיות לפרויקט?`)) return;
    for (const stage of PROJECT_STAGES) {
      await importStage(stage.name);
    }
  }

  async function createCustomTask() {
    if (!newTask.title.trim()) {
      setError("צריך למלא שם משימה");
      return;
    }

    setSavingTask(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert({
          organization_id: organizationId,
          project_id: projectId,
          title: newTask.title.trim(),
          description: buildDescription(newTask.description, newTask.responsible),
          category: newTask.category.trim() || "כללי",
          priority: newTask.priority,
          assigned_to_contact_id: newTask.assigned_to_contact_id || null,
          planned_start: newTask.planned_start || null,
          planned_end: newTask.planned_end || null,
          display_order: tasks.length,
          status: "not_started",
          progress_pct: 0,
        })
        .select(
          "*, assigned_to:contacts!assigned_to_contact_id(id, name, phone), checklist:task_checklist_items(id, description, is_done, display_order), comments:task_comments(id, author_type, author_name, body, attachments, created_at)"
        )
        .single();

      if (insertError) throw new Error(insertError.message);
      if (data) {
        setTasks((prev) => [...prev, { ...data, checklist: data.checklist || [], comments: data.comments || [] }]);
        setShowNewTaskForm(false);
        resetNewTaskForm();
        router.refresh();
      }
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "שגיאה ביצירת משימה");
    } finally {
      setSavingTask(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    const now = new Date().toISOString();
    let nextProgress: number | null = null;
    let completedAt: string | null = null;

    if (status === "completed") {
      nextProgress = 100;
      completedAt = now;
    } else if (status === "not_started") {
      nextProgress = 0;
      completedAt = null;
    } else {
      completedAt = null;
    }

    const patch: Record<string, unknown> = {
      status,
      updated_at: now,
      completed_at: completedAt,
    };
    if (nextProgress !== null) patch.progress_pct = nextProgress;

    const { error: updateError } = await supabase.from("tasks").update(patch).eq("id", taskId);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              completed_at: completedAt,
              progress_pct: nextProgress !== null ? nextProgress : task.progress_pct,
            }
          : task
      )
    );
  }

  async function updateTaskProgress(taskId: string, progress: number) {
    const safeProgress = Math.max(0, Math.min(100, progress));
    const nextStatus = safeProgress === 100 ? "completed" : safeProgress > 0 ? "in_progress" : "not_started";
    const completedAt = safeProgress === 100 ? new Date().toISOString() : null;

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        progress_pct: safeProgress,
        status: nextStatus,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, progress_pct: safeProgress, status: nextStatus, completed_at: completedAt }
          : task
      )
    );
  }

  async function updateTaskField(taskId: string, field: string, value: unknown) {
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)));
  }

  async function updateTaskDescription(task: Task, description: string) {
    const responsible = extractResponsible(task.description);
    await updateTaskField(task.id, "description", buildDescription(description, responsible));
  }

  async function updateTaskResponsible(task: Task, responsible: string) {
    await updateTaskField(task.id, "description", buildDescription(cleanDescription(task.description), responsible));
  }

  async function toggleChecklistItem(taskId: string, itemId: string, currentDone: boolean) {
    await supabase
      .from("task_checklist_items")
      .update({ is_done: !currentDone, done_at: !currentDone ? new Date().toISOString() : null })
      .eq("id", itemId);

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              checklist: task.checklist?.map((item) =>
                item.id === itemId ? { ...item, is_done: !currentDone } : item
              ),
            }
          : task
      )
    );
  }

  async function addTaskComment(task: Task) {
    const draft = commentDrafts[task.id] || { body: "", files: [] };
    if (!draft.body.trim() && draft.files.length === 0) return;

    setSavingCommentId(task.id);
    setError(null);

    try {
      const attachments: TaskAttachment[] = [];

      for (const [index, file] of draft.files.entries()) {
        const path = `${organizationId}/task-photos/${task.id}/${file.lastModified}-${index}-${safeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from("PLANS").upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

        if (uploadError) throw new Error(uploadError.message);
        const { data: publicUrl } = supabase.storage.from("PLANS").getPublicUrl(path);
        attachments.push({
          url: publicUrl.publicUrl,
          type: file.type || "application/octet-stream",
          name: file.name,
        });
      }

      const { data: insertedComment, error: commentError } = await supabase
        .from("task_comments")
        .insert({
          task_id: task.id,
          author_type: "user",
          author_name: "מנלו",
          body: draft.body.trim() || "צורפו קבצים למשימה",
          attachments,
        })
        .select("id, author_type, author_name, body, attachments, created_at")
        .single();

      if (commentError) throw new Error(commentError.message);

      if (insertedComment) {
        setTasks((prev) =>
          prev.map((item) =>
            item.id === task.id
              ? { ...item, comments: [...(item.comments || []), insertedComment as TaskComment] }
              : item
          )
        );
      }

      updateCommentDraft(task.id, { body: "", files: [] });
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "שגיאה בשמירת הערה");
    } finally {
      setSavingCommentId(null);
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm("למחוק את המשימה?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }

  async function assignProfessional(taskId: string, contactId: string | null) {
    await updateTaskField(taskId, "assigned_to_contact_id", contactId);
    router.refresh();
  }

  function shareToWhatsApp(task: Task) {
    if (!task.assigned_to?.phone) {
      alert("אין מספר טלפון לגורם המטפל. עדכן בכרטיס איש הקשר.");
      return;
    }
    if (!task.public_token) {
      alert("אין עדיין קישור ציבורי למשימה הזו.");
      return;
    }

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/tasks/public/${task.public_token}`;
    const message = `שלום ${task.assigned_to.name},

פרויקט: ${projectName}
סעיף: ${task.category || "כללי"}
משימה לביצוע:
*${task.title}*

${cleanDescription(task.description) ? cleanDescription(task.description) + "\n\n" : ""}לעדכון סטטוס והתקדמות:
${link}

תודה,
מנלו בנייה`;

    let cleanPhone = task.assigned_to.phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = `972${cleanPhone.slice(1)}`;
    else if (!cleanPhone.startsWith("972")) cleanPhone = `972${cleanPhone}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
  }

  function copyPublicLink(task: Task) {
    if (!task.public_token) {
      alert("אין עדיין קישור ציבורי למשימה הזו.");
      return;
    }
    const link = `${window.location.origin}/tasks/public/${task.public_token}`;
    navigator.clipboard.writeText(link);
    alert("הקישור הועתק. אפשר לשלוח אותו לגורם המטפל.");
  }

  function renderNewTaskForm() {
    if (!showNewTaskForm) return null;

    return (
      <div className="mb-4 rounded-lg border border-[var(--color-brand-yellow)]/60 bg-white p-4">
        <div className="mb-3 text-base font-semibold">משימה חדשה בפרויקט {projectName}</div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-neutral-500">שם המשימה</span>
              <input
                value={newTask.title}
                onChange={(event) => updateNewTask("title", event.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
                placeholder="לדוגמא: תיקון איטום במקלחת קומה 2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-neutral-500">סעיף / תחום בפרויקט</span>
              <input
                value={newTask.category}
                onChange={(event) => updateNewTask("category", event.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
                placeholder="שלד, חשמל, אינסטלציה, גמרים..."
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-neutral-500">באחריות מי?</span>
              <input
                value={newTask.responsible}
                onChange={(event) => updateNewTask("responsible", event.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
                placeholder="מנהל עבודה / מנחם / צוות משרד"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-neutral-500">גורם מטפל</span>
              <select
                value={newTask.assigned_to_contact_id}
                onChange={(event) => updateNewTask("assigned_to_contact_id", event.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
              >
                <option value="">ללא שיוך</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name} {professional.profession ? `(${professional.profession})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-neutral-500">עדיפות</span>
              <select
                value={newTask.priority}
                onChange={(event) => updateNewTask("priority", event.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-neutral-500">התחלה</span>
                <input
                  type="date"
                  value={newTask.planned_start}
                  onChange={(event) => updateNewTask("planned_start", event.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-neutral-500">סיום</span>
                <input
                  type="date"
                  value={newTask.planned_end}
                  onChange={(event) => updateNewTask("planned_end", event.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
                />
              </label>
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-neutral-500">הערות לביצוע</span>
            <textarea
              rows={3}
              value={newTask.description}
              onChange={(event) => updateNewTask("description", event.target.value)}
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm"
              placeholder="מה בדיוק צריך לבצע, איפה, ומה חשוב לבדוק בסיום"
            />
          </label>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowNewTaskForm(false);
                resetNewTaskForm();
              }}
            >
              ביטול
            </Button>
            <Button type="button" onClick={createCustomTask} disabled={savingTask}>
              <Save className="h-4 w-4" />
              {savingTask ? "שומר..." : "שמור משימה"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const grouped = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.category || "כללי";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});
  const averageProgress = tasks.length
    ? Math.round(tasks.reduce((sum, task) => sum + progressValue(task), 0) / tasks.length)
    : 0;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckSquare className="h-12 w-12 mx-auto mb-3 text-neutral-400" />
          <h3 className="text-lg font-semibold mb-2">עדיין אין משימות בפרויקט</h3>
          <p className="text-sm text-neutral-600 mb-6">
            אפשר להתחיל ממשימה אחת לביצוע, או לייבא תבניות של שלבי בנייה.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={() => setShowTemplates(!showTemplates)} disabled={importing}>
              <Sparkles className="h-4 w-4" />
              ייבא תבנית פרויקט
            </Button>
            <Button variant="outline" onClick={() => setShowNewTaskForm(true)}>
              <Plus className="h-4 w-4" />
              משימה חדשה
            </Button>
          </div>

          <div className="mt-6 text-right">{renderNewTaskForm()}</div>

          {showTemplates && (
            <div className="mt-6 border-t border-neutral-200 pt-6 text-right">
              <h4 className="font-semibold mb-3 text-center">בחר שלב לייבוא:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {PROJECT_STAGES.map((stage) => (
                  <button
                    key={stage.name}
                    onClick={() => importStage(stage.name)}
                    disabled={importing}
                    className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 hover:border-[var(--color-brand-yellow)] hover:bg-[var(--color-brand-yellow)]/10 transition-colors text-right"
                  >
                    <span className="text-2xl">{stage.emoji}</span>
                    <span className="flex-1">
                      <span className="font-medium block">{stage.name}</span>
                      <span className="text-xs text-neutral-500">{stage.tasks.length} משימות</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button onClick={importAllStages} disabled={importing}>
                  {importing ? "מייבא..." : "ייבא את כל השלבים"}
                </Button>
              </div>
            </div>
          )}

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-neutral-600">
          סה״כ {tasks.length} משימות · {completedTasks} בוצעו · התקדמות ממוצעת {averageProgress}%
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
            <Sparkles className="h-4 w-4" />
            הוסף תבנית
          </Button>
          <Button size="sm" onClick={() => setShowNewTaskForm(true)}>
            <Plus className="h-4 w-4" />
            משימה חדשה
          </Button>
        </div>
      </div>

      {renderNewTaskForm()}

      {showTemplates && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3">בחר שלב לייבוא:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {PROJECT_STAGES.map((stage) => (
                <button
                  key={stage.name}
                  onClick={() => importStage(stage.name)}
                  disabled={importing}
                  className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 hover:border-[var(--color-brand-yellow)] hover:bg-[var(--color-brand-yellow)]/10 transition-colors text-right text-sm"
                >
                  <span>{stage.emoji}</span>
                  <span className="flex-1 truncate">{stage.name}</span>
                  <span className="text-xs text-neutral-500">{stage.tasks.length}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, list]) => {
          const categoryProgress = Math.round(
            list.reduce((sum, task) => sum + progressValue(task), 0) / list.length
          );

          return (
            <Card key={category}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between gap-3">
                  <span>
                    {projectName} · {category}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {list.filter((task) => task.status === "completed").length}/{list.length} · {categoryProgress}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {list.map((task) => {
                  const expanded = expandedTasks.has(task.id);
                  const checklist = task.checklist || [];
                  const checkedCount = checklist.filter((item) => item.is_done).length;
                  const status = STATUS_LABELS[task.status] || STATUS_LABELS.not_started;
                  const currentProgress = progressValue(task);
                  const comments = [...(task.comments || [])].sort((a, b) =>
                    b.created_at.localeCompare(a.created_at)
                  );
                  const commentDraft = commentDrafts[task.id] || { body: "", files: [] };

                  return (
                    <div key={task.id} className="border-t border-neutral-100 first:border-0">
                      <div className="p-3 flex items-center gap-3">
                        <button
                          onClick={() => toggleExpand(task.id)}
                          className="text-neutral-400 hover:text-neutral-700 shrink-0"
                          aria-label={expanded ? "סגור פרטי משימה" : "פתח פרטי משימה"}
                        >
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{task.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                            {task.is_critical && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                נתיב קריטי
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5 flex-wrap">
                            {extractResponsible(task.description) && (
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" />
                                אחריות: {extractResponsible(task.description)}
                              </span>
                            )}
                            {task.assigned_to && (
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" />
                                מטפל: {task.assigned_to.name}
                              </span>
                            )}
                            {task.estimated_duration_days && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {task.estimated_duration_days} ימים
                              </span>
                            )}
                            {checklist.length > 0 && <span>צ׳ק-ליסט: {checkedCount}/{checklist.length}</span>}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-brand-green)]"
                                style={{ width: `${currentProgress}%` }}
                              />
                            </div>
                            <span className="text-xs text-neutral-500 ltr-numbers">{currentProgress}%</span>
                          </div>
                        </div>

                        <select
                          value={task.status}
                          onChange={(event) => updateTaskStatus(task.id, event.target.value)}
                          className="h-8 text-xs rounded border border-neutral-300 px-2"
                        >
                          {Object.entries(STATUS_LABELS).map(([key, val]) => (
                            <option key={key} value={key}>
                              {val.label}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-neutral-400 hover:text-red-600 p-1"
                          aria-label="מחק משימה"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {expanded && (
                        <div className="px-3 pb-3 space-y-3 bg-neutral-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                            <label>
                              <span className="text-xs text-neutral-500 mb-1 block">באחריות מי?</span>
                              <input
                                key={`responsible-${task.id}-${task.description || ""}`}
                                defaultValue={extractResponsible(task.description)}
                                onBlur={(event) => updateTaskResponsible(task, event.target.value)}
                                className="w-full h-9 text-sm rounded border border-neutral-300 px-2"
                                placeholder="מנהל עבודה / מנחם / משרד"
                              />
                            </label>
                            <label>
                              <span className="text-xs text-neutral-500 mb-1 block">גורם מטפל</span>
                              <select
                                value={task.assigned_to_contact_id || ""}
                                onChange={(event) => assignProfessional(task.id, event.target.value || null)}
                                className="w-full h-9 text-sm rounded border border-neutral-300 px-2"
                              >
                                <option value="">ללא שיוך</option>
                                {professionals.map((professional) => (
                                  <option key={professional.id} value={professional.id}>
                                    {professional.name} {professional.profession ? `(${professional.profession})` : ""}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span className="text-xs text-neutral-500 mb-1 block">סעיף בפרויקט</span>
                              <input
                                defaultValue={task.category || ""}
                                onBlur={(event) =>
                                  updateTaskField(task.id, "category", event.target.value.trim() || "כללי")
                                }
                                className="w-full h-9 text-sm rounded border border-neutral-300 px-2"
                                placeholder="שלד / גמרים / חשמל"
                              />
                            </label>
                            <label>
                              <span className="text-xs text-neutral-500 mb-1 block">תאריך התחלה</span>
                              <input
                                type="date"
                                value={task.planned_start || ""}
                                onChange={(event) =>
                                  updateTaskField(task.id, "planned_start", event.target.value || null)
                                }
                                className="w-full h-9 text-sm rounded border border-neutral-300 px-2"
                              />
                            </label>
                            <label>
                              <span className="text-xs text-neutral-500 mb-1 block">תאריך סיום</span>
                              <input
                                type="date"
                                value={task.planned_end || ""}
                                onChange={(event) =>
                                  updateTaskField(task.id, "planned_end", event.target.value || null)
                                }
                                className="w-full h-9 text-sm rounded border border-neutral-300 px-2"
                              />
                            </label>
                            <label>
                              <span className="text-xs text-neutral-500 mb-1 block">עדיפות</span>
                              <select
                                value={task.priority || "medium"}
                                onChange={(event) => updateTaskField(task.id, "priority", event.target.value)}
                                className="w-full h-9 text-sm rounded border border-neutral-300 px-2"
                              >
                                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className="bg-white rounded-lg border border-neutral-200 p-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="text-xs font-semibold text-neutral-700">התקדמות ביצוע</div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTaskProgress(task.id, 100)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                סמן כבוצע
                              </Button>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={currentProgress}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  setTasks((prev) =>
                                    prev.map((item) =>
                                      item.id === task.id ? { ...item, progress_pct: value } : item
                                    )
                                  );
                                }}
                                onMouseUp={(event) =>
                                  updateTaskProgress(task.id, Number((event.target as HTMLInputElement).value))
                                }
                                onTouchEnd={(event) =>
                                  updateTaskProgress(task.id, Number((event.target as HTMLInputElement).value))
                                }
                                className="flex-1"
                              />
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={currentProgress}
                                onChange={(event) => updateTaskProgress(task.id, Number(event.target.value))}
                                className="h-9 w-20 rounded border border-neutral-300 px-2 text-sm ltr-numbers"
                              />
                              <span className="text-sm text-neutral-500">%</span>
                            </div>
                          </div>

                          <label className="block bg-white rounded-lg border border-neutral-200 p-3">
                            <span className="text-xs font-semibold text-neutral-700 mb-2 block">הערות לביצוע</span>
                            <textarea
                              key={`description-${task.id}-${task.description || ""}`}
                              rows={3}
                              defaultValue={cleanDescription(task.description)}
                              onBlur={(event) => updateTaskDescription(task, event.target.value)}
                              className="w-full rounded border border-neutral-300 p-2 text-sm"
                              placeholder="הערות, תיקונים, דגשים לביצוע"
                            />
                          </label>

                          {task.assigned_to && (
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => shareToWhatsApp(task)}
                                className="!bg-[#25D366] hover:!bg-[#1FB855]"
                              >
                                <MessageCircle className="h-4 w-4" />
                                שלח לגורם המטפל
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => copyPublicLink(task)}>
                                <LinkIcon className="h-4 w-4" />
                                העתק קישור
                              </Button>
                            </div>
                          )}

                          {checklist.length > 0 && (
                            <div className="bg-white rounded-lg border border-neutral-200 p-3">
                              <div className="text-xs font-semibold text-neutral-700 mb-2">
                                צ׳ק-ליסט ({checkedCount}/{checklist.length})
                              </div>
                              <div className="space-y-1.5">
                                {checklist.map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => toggleChecklistItem(task.id, item.id, item.is_done)}
                                    className="w-full flex items-center gap-2 text-sm hover:bg-neutral-50 rounded p-1 text-right"
                                  >
                                    {item.is_done ? (
                                      <CheckSquare className="h-4 w-4 text-green-600 shrink-0" />
                                    ) : (
                                      <Square className="h-4 w-4 text-neutral-400 shrink-0" />
                                    )}
                                    <span className={item.is_done ? "line-through text-neutral-500" : ""}>
                                      {item.description}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="bg-white rounded-lg border border-neutral-200 p-3">
                            <div className="text-xs font-semibold text-neutral-700 mb-2 flex items-center gap-1">
                              <Paperclip className="h-4 w-4" />
                              הערות וקבצי ביצוע
                            </div>
                            <textarea
                              rows={3}
                              value={commentDraft.body}
                              onChange={(event) => updateCommentDraft(task.id, { body: event.target.value })}
                              className="w-full rounded border border-neutral-300 p-2 text-sm"
                              placeholder="כתוב הערה, תיקון, או עדכון מהשטח. אפשר לצרף תמונה, מסמך, וידיאו או הקלטה קולית."
                            />
                            <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                              <label className="inline-flex items-center gap-2 text-sm rounded-lg border border-neutral-300 px-3 py-2 cursor-pointer hover:bg-neutral-50">
                                <Paperclip className="h-4 w-4" />
                                צרף קובץ
                                <input
                                  type="file"
                                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.heic,.heif"
                                  multiple
                                  className="hidden"
                                  onChange={(event) =>
                                    updateCommentDraft(task.id, {
                                      files: Array.from(event.target.files || []),
                                    })
                                  }
                                />
                              </label>
                              <div className="text-xs text-neutral-500 flex-1">
                                {commentDraft.files.length > 0
                                  ? `${commentDraft.files.length} קבצים נבחרו`
                                  : "אפשר לצרף תמונה, מסמך, וידיאו או הקלטה קולית מהטלפון"}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addTaskComment(task)}
                                disabled={savingCommentId === task.id || (!commentDraft.body.trim() && commentDraft.files.length === 0)}
                              >
                                {savingCommentId === task.id ? "שומר..." : "שמור עדכון"}
                              </Button>
                            </div>
                            {commentDraft.files.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {commentDraft.files.map((file, fileIndex) => (
                                  <span
                                    key={`${file.name}-${fileIndex}`}
                                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    {file.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {comments.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {comments.map((comment) => (
                                  <div key={comment.id} className="rounded-lg bg-neutral-50 p-3">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="text-xs font-semibold text-neutral-700">
                                        {comment.author_name || "עדכון"}
                                      </span>
                                      <span className="text-xs text-neutral-500">
                                        {new Date(comment.created_at).toLocaleDateString("he-IL")}
                                      </span>
                                    </div>
                                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{comment.body}</p>
                                    {(comment.attachments || []).length > 0 && (
                                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                        {(comment.attachments || []).map((attachment, index) => {
                                          if (isImageAttachment(attachment)) {
                                            return (
                                            <a
                                              key={`${attachment.url}-${index}`}
                                              href={attachment.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="block overflow-hidden rounded-lg border border-neutral-200 bg-white"
                                            >
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                src={attachment.url}
                                                alt={attachment.name || "תמונת ביצוע"}
                                                className="h-28 w-full object-cover"
                                              />
                                            </a>
                                            );
                                          }

                                          if (isVideoAttachment(attachment)) {
                                            return (
                                              <a
                                                key={`${attachment.url}-${index}`}
                                                href={attachment.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-lg border border-neutral-200 bg-white p-2"
                                              >
                                                <div className="mb-2 flex items-center gap-1 text-xs font-medium text-neutral-700">
                                                  <FileVideo className="h-4 w-4" />
                                                  {attachment.name || "וידיאו"}
                                                </div>
                                                <video src={attachment.url} controls className="h-28 w-full rounded bg-neutral-100 object-cover" />
                                              </a>
                                            );
                                          }

                                          if (isAudioAttachment(attachment)) {
                                            return (
                                              <a
                                                key={`${attachment.url}-${index}`}
                                                href={attachment.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-lg border border-neutral-200 bg-white p-3"
                                              >
                                                <div className="mb-2 flex items-center gap-1 text-xs font-medium text-neutral-700">
                                                  <FileAudio className="h-4 w-4" />
                                                  {attachment.name || "הקלטה קולית"}
                                                </div>
                                                <audio src={attachment.url} controls className="w-full" />
                                              </a>
                                            );
                                          }

                                          return (
                                            <a
                                              key={`${attachment.url}-${index}`}
                                              href={attachment.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="flex min-h-24 flex-col justify-center rounded-lg border border-neutral-200 bg-white p-3 text-xs text-[var(--color-brand-blue)]"
                                            >
                                              <File className="mb-2 h-5 w-5" />
                                              <span className="break-words">{attachment.name || "קובץ מצורף"}</span>
                                            </a>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
    </div>
  );
}
