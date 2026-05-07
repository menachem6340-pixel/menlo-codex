import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PlansSection } from "@/components/projects/plans-section";
import { DeleteRecordButton } from "@/components/actions/delete-record-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowRight,
  Calendar,
  Calculator,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListTodo,
  MapPin,
  Phone,
  Upload,
  User,
  Wallet,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const projectStatusLabels: Record<string, string> = {
  lead: "ליד",
  quoted: "הצעת מחיר",
  active: "פעיל",
  paused: "מושהה",
  completed: "הושלם",
  cancelled: "בוטל",
};

const taskStatusLabels: Record<string, { label: string; color: string }> = {
  not_started: { label: "טרם התחיל", color: "bg-neutral-100 text-neutral-700" },
  in_progress: { label: "בביצוע", color: "bg-blue-100 text-blue-700" },
  blocked: { label: "חסום", color: "bg-orange-100 text-orange-700" },
  completed: { label: "הושלם", color: "bg-green-100 text-green-700" },
  cancelled: { label: "בוטל", color: "bg-red-100 text-red-700" },
};

const quoteStatusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "טיוטה", color: "bg-neutral-100 text-neutral-700" },
  sent: { label: "נשלחה", color: "bg-blue-100 text-blue-700" },
  approved: { label: "אושרה", color: "bg-green-100 text-green-700" },
  rejected: { label: "נדחתה", color: "bg-red-100 text-red-700" },
  expired: { label: "פג תוקף", color: "bg-yellow-100 text-yellow-700" },
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, client:contacts(id, name, phone, email)")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const [{ data: plansRaw }, { data: boqs }, { data: quotes }, { data: tasks }] = await Promise.all([
    supabase
      .from("plans")
      .select("id, name, file_url, file_type, category, created_at, plan_analyses(id, status, total_area_sqm, created_at)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("boqs").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("quotes").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, status, priority, planned_end, progress_pct, assigned_to:contacts!assigned_to_contact_id(name)")
      .eq("project_id", id)
      .order("display_order"),
  ]);

  const plans = (plansRaw || []).map((p) => {
    const analyses =
      (p.plan_analyses as Array<{ id: string; status: string; total_area_sqm: number; created_at: string }> | null) || [];
    const latest = analyses.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return {
      id: p.id,
      name: p.name,
      file_url: p.file_url,
      file_type: p.file_type,
      category: (p.category || "other") as import("@/lib/plans/categories").PlanCategory,
      created_at: p.created_at,
      analysis: latest ? { id: latest.id, status: latest.status, total_area_sqm: latest.total_area_sqm } : null,
    };
  });

  const client = project.client as { id: string; name: string; phone?: string; email?: string } | null;
  const completedTasks = (tasks || []).filter((task) => task.status === "completed").length;
  const taskProgress = tasks?.length
    ? Math.round(
        tasks.reduce((sum, task) => sum + (task.status === "completed" ? 100 : Number(task.progress_pct || 0)), 0) /
          tasks.length
      )
    : 0;
  const boqTotal = (boqs || []).reduce((sum, boq) => sum + Number(boq.total_amount || 0), 0);
  const quotesTotal = (quotes || []).reduce((sum, quote) => sum + Number(quote.total_amount || 0), 0);
  const quoteHref = `/dashboard/quotes/new?projectId=${id}${client?.id ? `&clientId=${client.id}` : ""}`;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={project.name}
        description={`סטטוס: ${projectStatusLabels[project.status] || project.status}`}
        action={
          <Link href="/dashboard/projects">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה לפרויקטים
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>תקציר פרויקט</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProjectStat icon={User} label="לקוח" value={client?.name || "לא שויך לקוח"} />
              <ProjectStat icon={Phone} label="טלפון לקוח" value={client?.phone || "—"} />
              <ProjectStat icon={MapPin} label="כתובת" value={project.address || "—"} />
              <ProjectStat
                icon={Calendar}
                label="תאריכים"
                value={
                  project.start_date
                    ? `${formatDate(project.start_date)}${project.end_date ? ` - ${formatDate(project.end_date)}` : ""}`
                    : "לא הוגדר"
                }
              />
              <ProjectStat
                icon={Wallet}
                label="תקציב"
                value={project.budget ? formatCurrency(project.budget) : "לא הוגדר"}
              />
              <ProjectStat
                icon={Calculator}
                label="כתבי כמויות / הצעות"
                value={`${formatCurrency(boqTotal)} / ${formatCurrency(quotesTotal)}`}
              />
            </div>
            {project.description && (
              <div className="mt-5 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700 whitespace-pre-wrap">
                {project.description}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>התקדמות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>משימות שהושלמו</span>
                <span className="font-semibold ltr-numbers">{taskProgress}%</span>
              </div>
              <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-[var(--color-brand-green)]"
                  style={{ width: `${taskProgress}%` }}
                />
              </div>
              <div className="text-xs text-neutral-500 mt-2">
                {completedTasks}/{tasks?.length || 0} משימות ברשימת הפרויקט
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MiniStat label="תכניות" value={plans.length} />
              <MiniStat label="משימות" value={tasks?.length || 0} />
              <MiniStat label="כתבי כמויות" value={boqs?.length || 0} />
              <MiniStat label="הצעות" value={quotes?.length || 0} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <QuickAction
          href={`/dashboard/projects/${id}/tasks`}
          icon={ListTodo}
          title="משימות"
          description="הוסף משימות, תבניות ביצוע ושיוך לבעלי מקצוע"
        />
        <QuickAction
          href={`/dashboard/projects/${id}/plans/upload`}
          icon={Upload}
          title="העלה תכנית"
          description="שמור PDF או תמונה של תכנית בפרויקט"
        />
        <QuickAction
          href={`/dashboard/projects/${id}/boq/new`}
          icon={Calculator}
          title="כתב כמויות"
          description="צור כתב כמויות ידני או מתוך ניתוח תכנית"
        />
        <QuickAction
          href={quoteHref}
          icon={FileText}
          title="הצעת מחיר"
          description="הפק הצעה עם מע״מ, תנאי תשלום ו-PDF"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>משימות ({tasks?.length || 0})</span>
              <Link href={`/dashboard/projects/${id}/tasks`}>
                <Button variant="outline" size="sm">
                  <ListTodo className="h-4 w-4" />
                  פתח משימות
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!tasks || tasks.length === 0 ? (
              <EmptyPanel
                text="עדיין אין משימות בפרויקט. אפשר להתחיל ממשימה חופשית או מתבנית ביצוע."
                href={`/dashboard/projects/${id}/tasks`}
                action="הוסף משימות"
              />
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 8).map((task) => {
                  const status = taskStatusLabels[task.status] || taskStatusLabels.not_started;
                  const assigned = firstRelation<{ name: string }>(task.assigned_to);
                  const progress = task.status === "completed" ? 100 : Number(task.progress_pct || 0);
                  return (
                    <Link
                      key={task.id}
                      href={`/dashboard/projects/${id}/tasks`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 hover:border-[var(--color-brand-yellow)] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{task.title}</div>
                        <div className="text-xs text-neutral-500 truncate">
                          {assigned?.name || "לא שויך"}
                          {task.planned_end ? ` · יעד: ${formatDate(task.planned_end)}` : ""}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-brand-green)]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-500 ltr-numbers">{progress}%</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${status.color}`}>
                        {status.label}
                      </span>
                    </Link>
                  );
                })}
                {tasks.length > 8 && (
                  <Link
                    href={`/dashboard/projects/${id}/tasks`}
                    className="block rounded-lg border border-dashed border-neutral-300 p-3 text-center text-sm text-[var(--color-brand-blue)] hover:border-[var(--color-brand-yellow)]"
                  >
                    הצג עוד {tasks.length - 8} משימות
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תכניות ({plans.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <PlansSection projectId={id} plans={plans} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>כתבי כמויות ({boqs?.length ?? 0})</span>
              <Link href={`/dashboard/projects/${id}/boq/new`}>
                <Button variant="outline" size="sm">
                  <Calculator className="h-4 w-4" />
                  חדש
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!boqs || boqs.length === 0 ? (
              <EmptyPanel
                text="לא נוצר כתב כמויות לפרויקט. אפשר ליצור כתב ידני ולהוסיף שורות."
                href={`/dashboard/projects/${id}/boq/new`}
                action="כתב כמויות חדש"
              />
            ) : (
              <div className="space-y-2">
                {boqs.map((boq) => (
                  <div
                    key={boq.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:border-[var(--color-brand-yellow)] transition-colors"
                  >
                    <Link href={`/dashboard/boq/${boq.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                      <Calculator className="h-5 w-5 text-[var(--color-brand-green)] shrink-0" />
                      <span className="font-medium truncate">{boq.name}</span>
                    </Link>
                    <span className="font-semibold text-[var(--color-brand-blue)] ltr-numbers shrink-0">
                      {formatCurrency(boq.total_amount || 0)}
                    </span>
                    <div className="mr-3 shrink-0">
                      <DeleteRecordButton id={boq.id} type="boq" compact />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>הצעות מחיר ({quotes?.length ?? 0})</span>
              <Link href={quoteHref}>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4" />
                  חדשה
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!quotes || quotes.length === 0 ? (
              <EmptyPanel
                text="עדיין אין הצעת מחיר לפרויקט הזה. אפשר ליצור הצעה ידנית או מתוך כתב כמויות."
                href={quoteHref}
                action="הצעת מחיר חדשה"
              />
            ) : (
              <div className="space-y-2">
                {quotes.map((quote) => {
                  const status = quoteStatusLabels[quote.status] || quoteStatusLabels.draft;
                  return (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:border-[var(--color-brand-yellow)] transition-colors"
                    >
                      <Link href={`/dashboard/quotes/${quote.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="h-5 w-5 text-[var(--color-brand-yellow)] shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            <span dir="ltr">#{quote.quote_number}</span> · {quote.title}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </Link>
                      <span className="font-semibold text-[var(--color-brand-blue)] ltr-numbers shrink-0">
                        {formatCurrency(quote.total_amount || 0)}
                      </span>
                      <div className="mr-3 shrink-0">
                        <DeleteRecordButton id={quote.id} type="quote" compact />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[var(--color-brand-blue)]" />
            מסמכי הפרויקט
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DocumentStep
              icon={Upload}
              title="תכניות"
              value={`${plans.length} קבצים`}
              href={`/dashboard/projects/${id}/plans/upload`}
            />
            <DocumentStep
              icon={Calculator}
              title="כתבי כמויות"
              value={`${boqs?.length || 0} מסמכים`}
              href={`/dashboard/projects/${id}/boq/new`}
            />
            <DocumentStep
              icon={CheckCircle2}
              title="הצעות מחיר"
              value={`${quotes?.length || 0} מסמכים`}
              href={quoteHref}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <div className="text-2xl font-bold text-[var(--color-brand-dark)] ltr-numbers">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-white border border-neutral-200 p-4 hover:border-[var(--color-brand-yellow)] hover:shadow-sm transition-all"
    >
      <Icon className="h-5 w-5 text-[var(--color-brand-blue)] mb-3" />
      <h3 className="font-semibold text-[var(--color-brand-dark)]">{title}</h3>
      <p className="text-xs text-neutral-600 mt-1">{description}</p>
    </Link>
  );
}

function EmptyPanel({
  text,
  href,
  action,
}: {
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-5 text-center">
      <p className="text-sm text-neutral-600 mb-3">{text}</p>
      <Link href={href}>
        <Button variant="outline" size="sm">
          {action}
        </Button>
      </Link>
    </div>
  );
}

function DocumentStep({
  icon: Icon,
  title,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:border-[var(--color-brand-yellow)] transition-colors"
    >
      <div className="h-10 w-10 rounded-lg bg-[var(--color-brand-yellow)]/20 flex items-center justify-center">
        <Icon className="h-5 w-5 text-[var(--color-brand-blue)]" />
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-neutral-500">{value}</div>
      </div>
    </Link>
  );
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
