import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Briefcase,
  Calculator,
  Clock,
  FileText,
  ListTodo,
  Plus,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

const openTaskStatuses = ["not_started", "in_progress", "blocked"];
const quoteWorkStatuses = ["draft", "sent"];

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

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: projectsCount },
    { count: activeProjectsCount },
    { count: clientsCount },
    { count: openTasksCount },
    { count: quotesInWorkCount },
    { data: quotesInWork },
    { data: recentProjects },
    { data: openTasks },
    { data: recentQuotes },
    { data: recentClients },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .in("status", ["lead", "quoted", "active", "paused"]),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("type", "client"),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .in("status", openTaskStatuses),
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .in("status", quoteWorkStatuses),
    supabase.from("quotes").select("total_amount").in("status", quoteWorkStatuses),
    supabase
      .from("projects")
      .select("id, name, status, budget, start_date, client:contacts(name)")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("tasks")
      .select("id, title, status, priority, planned_end, project:projects(id, name)")
      .in("status", openTaskStatuses)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("quotes")
      .select("id, quote_number, title, status, total_amount, issue_date, client:contacts(name), project:projects(id, name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("contacts")
      .select("id, name, phone, city")
      .eq("type", "client")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const pipelineTotal = (quotesInWork || []).reduce(
    (sum, q) => sum + Number(q.total_amount || 0),
    0
  );
  const firstProjectId = recentProjects?.[0]?.id;
  const hasWork = Boolean((projectsCount || 0) + (clientsCount || 0) + (recentQuotes?.length || 0));

  const stats = [
    {
      label: "פרויקטים פעילים",
      value: activeProjectsCount ?? 0,
      helper: `${projectsCount ?? 0} פרויקטים בסך הכל`,
      icon: Briefcase,
      color: "text-[var(--color-brand-blue)]",
      bg: "bg-[var(--color-brand-blue)]/10",
    },
    {
      label: "משימות פתוחות",
      value: openTasksCount ?? 0,
      helper: "טרם התחיל, בביצוע או חסום",
      icon: ListTodo,
      color: "text-[var(--color-brand-green)]",
      bg: "bg-[var(--color-brand-green)]/10",
    },
    {
      label: "הצעות בטיפול",
      value: quotesInWorkCount ?? 0,
      helper: "טיוטות והצעות שנשלחו",
      icon: Calculator,
      color: "text-[var(--color-brand-dark)]",
      bg: "bg-[var(--color-brand-yellow)]/30",
    },
    {
      label: "שווי הצעות פתוחות",
      value: formatCurrency(pipelineTotal),
      helper: "סכום לפני אישור לקוח",
      icon: Wallet,
      color: "text-[var(--color-brand-blue)]",
      bg: "bg-[var(--color-brand-blue)]/10",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-brand-dark)]">
            מרכז עבודה
          </h1>
          <p className="text-neutral-600 mt-1">
            תמונת מצב מהירה של הפרויקטים, המשימות, הלקוחות וההצעות שלך
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/clients/new">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4" />
              לקוח חדש
            </Button>
          </Link>
          <Link href="/dashboard/projects/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              פרויקט חדש
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg mb-3 ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="text-2xl font-bold text-[var(--color-brand-dark)] ltr-numbers">
                {s.value}
              </div>
              <div className="text-sm text-neutral-700">{s.label}</div>
              <div className="text-xs text-neutral-500 mt-1">{s.helper}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>מה לעשות עכשיו</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <NextAction
              href="/dashboard/clients/new"
              icon={Users}
              title="הוסף לקוח"
              description="פותח את זרימת העבודה: לקוח, פרויקט והצעה."
            />
            <NextAction
              href="/dashboard/projects/new"
              icon={Briefcase}
              title="פתח פרויקט"
              description="מרכז אחד לכל המשימות, התכניות והמסמכים."
            />
            <NextAction
              href={firstProjectId ? `/dashboard/projects/${firstProjectId}/tasks` : "/dashboard/projects/new"}
              icon={ListTodo}
              title="נהל משימות"
              description="תבניות ביצוע, משימות פתוחות ומעקב התקדמות."
            />
            <NextAction
              href="/dashboard/quotes/new"
              icon={FileText}
              title="צור הצעה"
              description="שורות עבודה, מע״מ, תנאי תשלום ו-PDF."
            />
          </div>
        </CardContent>
      </Card>

      {!hasWork && (
        <Card className="mb-6 border-[var(--color-brand-yellow)]/60 bg-[var(--color-brand-yellow)]/10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-brand-dark)] mb-1">
                  התחלה מומלצת לעבודה ראשונה
                </h2>
                <p className="text-sm text-neutral-700">
                  הוסף לקוח אחד, פתח פרויקט עבורו, צור כמה משימות ואז הפק הצעת מחיר. ככה תראה את כל הזרימה בלי להסתבך עם הגדרות.
                </p>
              </div>
              <Link href="/dashboard/clients/new" className="shrink-0">
                <Button>
                  <Plus className="h-4 w-4" />
                  התחל מלקוח ראשון
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[var(--color-brand-blue)]" />
              פרויקטים אחרונים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentProjects || recentProjects.length === 0 ? (
              <EmptyHint
                text="עדיין אין פרויקטים. אחרי יצירת פרויקט תראה כאן את הסטטוס, הלקוח והתקציב."
                href="/dashboard/projects/new"
                action="פרויקט חדש"
              />
            ) : (
              <div className="space-y-2">
                {recentProjects.map((project) => {
                  const client = firstRelation<{ name: string }>(project.client);
                  return (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 hover:border-[var(--color-brand-yellow)] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{project.name}</div>
                        <div className="text-xs text-neutral-500 truncate">
                          {client?.name || "ללא לקוח"} · {projectStatusLabels[project.status] || project.status}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-[var(--color-brand-blue)] ltr-numbers shrink-0">
                        {project.budget ? formatCurrency(project.budget) : "אין תקציב"}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--color-brand-green)]" />
              משימות פתוחות
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!openTasks || openTasks.length === 0 ? (
              <EmptyHint
                text="אין משימות פתוחות כרגע. אפשר להוסיף משימות מתוך עמוד פרויקט."
                href={firstProjectId ? `/dashboard/projects/${firstProjectId}/tasks` : "/dashboard/projects/new"}
                action="הוסף משימות"
              />
            ) : (
              <div className="space-y-2">
                {openTasks.map((task) => {
                  const project = firstRelation<{ id: string; name: string }>(task.project);
                  const status = taskStatusLabels[task.status] || taskStatusLabels.not_started;
                  return (
                    <Link
                      key={task.id}
                      href={project ? `/dashboard/projects/${project.id}/tasks` : "/dashboard/tasks"}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 hover:border-[var(--color-brand-yellow)] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{task.title}</div>
                        <div className="text-xs text-neutral-500 truncate">
                          {project?.name || "ללא פרויקט"}
                          {task.planned_end ? ` · יעד: ${formatDate(task.planned_end)}` : ""}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${status.color}`}>
                        {status.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--color-brand-blue)]" />
              הצעות מחיר אחרונות
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentQuotes || recentQuotes.length === 0 ? (
              <EmptyHint
                text="עדיין אין הצעות מחיר. אפשר ליצור הצעה ידנית או מתוך כתב כמויות."
                href="/dashboard/quotes/new"
                action="הצעה חדשה"
              />
            ) : (
              <div className="space-y-2">
                {recentQuotes.map((quote) => {
                  const client = firstRelation<{ name: string }>(quote.client);
                  const status = quoteStatusLabels[quote.status] || quoteStatusLabels.draft;
                  return (
                    <Link
                      key={quote.id}
                      href={`/dashboard/quotes/${quote.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 hover:border-[var(--color-brand-yellow)] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          <span dir="ltr">#{quote.quote_number}</span> · {quote.title}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {client?.name || "ללא לקוח"} · {formatDate(quote.issue_date)}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="font-semibold text-[var(--color-brand-blue)] ltr-numbers">
                          {formatCurrency(quote.total_amount || 0)}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--color-brand-green)]" />
              לקוחות אחרונים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentClients || recentClients.length === 0 ? (
              <EmptyHint
                text="עדיין אין לקוחות. מומלץ להתחיל בהוספת לקוח ראשון."
                href="/dashboard/clients/new"
                action="לקוח חדש"
              />
            ) : (
              <div className="space-y-2">
                {recentClients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/dashboard/clients/${client.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 hover:border-[var(--color-brand-yellow)] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{client.name}</div>
                      <div className="text-xs text-neutral-500 truncate">
                        {[client.city, client.phone].filter(Boolean).join(" · ") || "אין פרטים נוספים"}
                      </div>
                    </div>
                    <span className="text-xs text-[var(--color-brand-blue)] shrink-0">פתח</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NextAction({
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
      className="rounded-lg border border-neutral-200 p-4 hover:border-[var(--color-brand-yellow)] hover:bg-[var(--color-brand-yellow)]/10 transition-colors"
    >
      <Icon className="h-5 w-5 text-[var(--color-brand-blue)] mb-3" />
      <div className="font-semibold text-[var(--color-brand-dark)]">{title}</div>
      <p className="text-xs text-neutral-600 mt-1">{description}</p>
    </Link>
  );
}

function EmptyHint({
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
          <Plus className="h-4 w-4" />
          {action}
        </Button>
      </Link>
    </div>
  );
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
