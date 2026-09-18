import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, BriefcaseBusiness, CalendarClock, Camera, CheckCircle2, CircleDashed, ListTodo, MapPinned, Plus, UserRoundX } from "lucide-react";

const OPEN = ["not_started", "in_progress", "blocked"];
type ProjectRelation = { id: string; name: string } | { id: string; name: string }[] | null;
type Task = { id: string; title: string; status: string; priority: string; planned_end?: string | null; assigned_to_contact_id?: string | null; updated_at?: string | null; project: ProjectRelation };

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: projects, error: projectsError }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase.from("projects").select("id, name, status, address, updated_at").in("status", ["lead", "quoted", "active", "paused"]).order("updated_at", { ascending: false }).limit(8),
    supabase.from("tasks").select("id, title, status, priority, planned_end, assigned_to_contact_id, updated_at, project:projects(id, name)").in("status", OPEN).order("updated_at", { ascending: false }).limit(100),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const openTasks = (tasks || []) as Task[];
  const blocked = openTasks.filter((task) => task.status === "blocked");
  const overdue = openTasks.filter((task) => task.planned_end && task.planned_end < today);
  const unassigned = openTasks.filter((task) => !task.assigned_to_contact_id);
  const unscheduled = openTasks.filter((task) => !task.planned_end);
  const attention = uniqueTasks([...blocked, ...overdue, ...unassigned]).slice(0, 8);
  const unavailable = projectsError || tasksError;

  return <div className="mx-auto max-w-7xl space-y-6">
    <section className="relative overflow-hidden rounded-[1.6rem] bg-[var(--color-brand-dark)] px-5 py-7 text-white shadow-xl shadow-neutral-900/10 sm:px-8 sm:py-9">
      <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[var(--color-brand-blue)]/35 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl"><span className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[var(--color-brand-yellow)]">מרכז ביצוע · מנלו קודקס</span><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">מה דורש החלטה עכשיו</h1><p className="mt-2 max-w-xl text-sm leading-6 text-neutral-300">משימות, חסמים וחוסרים מכל האתרים. לחיצה פותחת את העבודה בהקשר שלה.</p></div>
        <div className="flex gap-2"><Link href="/dashboard/projects/new"><Button size="sm"><Plus className="h-4 w-4" />פרויקט חדש</Button></Link><Link href="/dashboard/tasks"><Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20"><ListTodo className="h-4 w-4" />כל המשימות</Button></Link></div>
      </div>
      <div className="relative mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4"><HeroMetric icon={AlertTriangle} label="חסומות" value={blocked.length} tone="yellow" /><HeroMetric icon={CalendarClock} label="באיחור" value={overdue.length} /><HeroMetric icon={UserRoundX} label="ללא אחראי" value={unassigned.length} /><HeroMetric icon={CircleDashed} label="ללא יעד" value={unscheduled.length} /></div>
    </section>

    {unavailable && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>חלק מהמידע אינו זמין כרגע.</strong> המערכת אינה מציגה אפס במקום כשל. רענן את הדף או בדוק את החיבור.</div>}

    <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <section className="control-section">
        <header><div><span className="eyebrow">סדר יום</span><h2>לטיפול והכרעה</h2></div><Link href="/dashboard/tasks" className="text-sm font-semibold text-[var(--color-brand-blue)]">פתח רשימה מלאה</Link></header>
        <div className="divide-y divide-neutral-100">{attention.map((task) => { const project = first(task.project); const reason = task.status === "blocked" ? "חסום" : task.planned_end && task.planned_end < today ? "באיחור" : "ללא אחראי"; return <Link key={task.id} href={project ? `/dashboard/projects/${project.id}/tasks?task=${task.id}#task-${task.id}` : "/dashboard/tasks"} className="group grid gap-2 py-4 first:pt-0 sm:grid-cols-[1fr_140px_96px_auto] sm:items-center"><div><strong className="block text-sm text-neutral-900 group-hover:text-[var(--color-brand-blue)]">{task.title}</strong><span className="text-xs text-neutral-500">{project?.name || "פרויקט לא זמין"}</span></div><span className="text-xs text-neutral-500">{task.planned_end ? `יעד ${formatDate(task.planned_end)}` : "אין תאריך יעד"}</span><span className={`status-chip justify-self-start ${reason === "חסום" ? "bg-orange-50 text-orange-700" : reason === "באיחור" ? "bg-red-50 text-red-700" : ""}`}>{reason}</span><ArrowLeft className="hidden h-4 w-4 text-neutral-300 group-hover:text-[var(--color-brand-blue)] sm:block" /></Link>; })}{!attention.length && !unavailable && <div className="flex items-center gap-3 py-8 text-sm text-neutral-500"><CheckCircle2 className="h-5 w-5 text-emerald-600" />אין כרגע פריטים שמחייבים טיפול.</div>}</div>
      </section>
      <section className="control-section"><header><div><span className="eyebrow">שטח</span><h2>פעולות מהירות</h2></div></header><div className="grid gap-3"><QuickAction href="/dashboard/tasks" icon={Camera} title="פתח דיווח מצולם" text="בחר משימה והוסף תמונה או עדכון." /><QuickAction href="/dashboard/projects" icon={MapPinned} title="מרכז בקרת פרויקט" text="אזורים, מקבצים ומפרט מאושר." /><QuickAction href="/dashboard/plans" icon={BriefcaseBusiness} title="מצא תכנית מחייבת" text="גש לתכניות לפי פרויקט וסוג מסמך." /></div></section>
    </div>

    <section><div className="mb-4 flex items-end justify-between"><div><span className="eyebrow">אתרים פעילים</span><h2 className="text-2xl font-bold">פרויקטים</h2></div><Link href="/dashboard/projects" className="text-sm font-semibold text-[var(--color-brand-blue)]">כל הפרויקטים</Link></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{(projects || []).map((project) => <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="group"><Card className="h-full transition-all hover:-translate-y-1 hover:border-[var(--color-brand-blue)]/30 hover:shadow-lg"><CardContent className="p-5"><div className="mb-7 flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)]"><BriefcaseBusiness className="h-5 w-5" /></span><span className="status-chip">{project.status === "active" ? "פעיל" : project.status === "paused" ? "מושהה" : "בהכנה"}</span></div><h3 className="font-semibold group-hover:text-[var(--color-brand-blue)]">{project.name}</h3><p className="mt-1 min-h-5 text-xs text-neutral-500">{project.address || "כתובת טרם הוזנה"}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 group-hover:text-[var(--color-brand-blue)]">פתח סביבת פרויקט <ArrowLeft className="h-3.5 w-3.5" /></span></CardContent></Card></Link>)}{!projects?.length && !unavailable && <Card><CardContent className="p-6 text-sm text-neutral-500">אין עדיין פרויקטים פעילים.</CardContent></Card>}</div></section>
  </div>;
}

function HeroMetric({ icon: Icon, label, value, tone }: { icon: typeof AlertTriangle; label: string; value: number; tone?: "yellow" }) { return <div className="rounded-xl border border-white/10 bg-white/[.07] p-3 backdrop-blur"><div className="flex items-center gap-2 text-xs text-neutral-300"><Icon className={`h-4 w-4 ${tone ? "text-[var(--color-brand-yellow)]" : "text-sky-300"}`} />{label}</div><strong className="mt-2 block text-2xl">{value}</strong></div>; }
function QuickAction({ href, icon: Icon, title, text }: { href: string; icon: typeof Camera; title: string; text: string }) { return <Link href={href} className="group flex gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-[var(--color-brand-blue)]/40 hover:bg-sky-50/40"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-[var(--color-brand-blue)] group-hover:text-white"><Icon className="h-5 w-5" /></span><div><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-neutral-500">{text}</span></div></Link>; }
function uniqueTasks(tasks: Task[]) { return Array.from(new Map(tasks.map((task) => [task.id, task])).values()); }
function first(value: ProjectRelation) { return Array.isArray(value) ? value[0] || null : value; }
function formatDate(value: string) { return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T00:00:00`)); }
