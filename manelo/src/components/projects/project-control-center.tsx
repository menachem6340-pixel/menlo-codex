"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, FileCheck2, Image as ImageIcon, Layers3, MapPinned, Plus, ShieldCheck } from "lucide-react";

type Area = { id: string; name: string; description?: string | null; sort_order: number };
type Group = { id: string; title: string; status: string; area_id?: string | null; target_date?: string | null; tasks?: { count: number }[] };
type Spec = { id: string; label: string; value: string; unit?: string | null; status: string; area_id?: string | null; revision: number; source_note?: string | null };
type Task = { id: string; title: string; status: string; area_id?: string | null; task_group_id?: string | null };
type Media = { id: string; file_url: string; media_type?: string | null; caption?: string | null; captured_at: string; task_id?: string | null };

interface Props {
  projectId: string;
  organizationId: string;
  areas: Area[];
  groups: Group[];
  specs: Spec[];
  tasks: Task[];
  media: Media[];
}

export function ProjectControlCenter({ projectId, organizationId, areas, groups, specs, tasks, media }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [areaName, setAreaName] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupArea, setGroupArea] = useState("");
  const [specLabel, setSpecLabel] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [specArea, setSpecArea] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkArea, setBulkArea] = useState("");
  const [bulkGroup, setBulkGroup] = useState("");

  async function run(key: string, operation: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(key);
    setMessage(null);
    const { error } = await operation();
    setBusy(null);
    if (error) {
      setMessage({ kind: "error", text: `השמירה נכשלה: ${error.message}` });
      return false;
    }
    setMessage({ kind: "ok", text: "נשמר וסונכרן" });
    router.refresh();
    return true;
  }

  async function addArea() {
    const name = areaName.trim();
    if (!name) return;
    const ok = await run("area", () => supabase.from("project_areas").insert({
      organization_id: organizationId, project_id: projectId, name, sort_order: areas.length,
    }));
    if (ok) setAreaName("");
  }

  async function addGroup() {
    const title = groupTitle.trim();
    if (!title) return;
    const ok = await run("group", () => supabase.from("task_groups").insert({
      organization_id: organizationId, project_id: projectId, title, area_id: groupArea || null,
    }));
    if (ok) setGroupTitle("");
  }

  async function addSpec() {
    const label = specLabel.trim();
    const value = specValue.trim();
    if (!label || !value) return;
    const ok = await run("spec", () => supabase.from("project_specs").insert({
      organization_id: organizationId,
      project_id: projectId,
      area_id: specArea || null,
      spec_key: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      value,
      status: "draft",
      source_note: "נוסף ידנית במרכז הבקרה",
    }));
    if (ok) { setSpecLabel(""); setSpecValue(""); }
  }

  async function applyBulkAssignment() {
    if (!selectedTasks.size) return;
    const patch: { area_id?: string | null; task_group_id?: string | null } = {};
    if (bulkArea) patch.area_id = bulkArea === "none" ? null : bulkArea;
    if (bulkGroup) patch.task_group_id = bulkGroup === "none" ? null : bulkGroup;
    if (!Object.keys(patch).length) return;
    const ok = await run("bulk", () => supabase.from("tasks").update(patch).in("id", [...selectedTasks]));
    if (ok) setSelectedTasks(new Set());
  }

  const areaNameById = new Map(areas.map((area) => [area.id, area.name]));

  return (
    <div className="space-y-6">
      {message && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm font-medium ${message.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={MapPinned} value={areas.length} label="אזורי עבודה" />
        <Metric icon={Layers3} value={groups.length} label="מקבצי ביצוע" />
        <Metric icon={ShieldCheck} value={specs.filter((spec) => spec.status === "confirmed").length} label="פרטי מפרט מאושרים" />
      </div>

      <section className="control-section">
        <header><div><span className="eyebrow">מבנה האתר</span><h2>אזורי עבודה</h2></div><p>חלוקה קבועה שמחברת משימות, תכניות ומפרט לאותו מקום.</p></header>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={areaName} onChange={(event) => setAreaName(event.target.value)} placeholder="למשל: חדר טבילה 1" className="field-control" />
          <Button onClick={addArea} disabled={busy === "area" || !areaName.trim()}><Plus className="h-4 w-4" />הוסף אזור</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map((area) => <div key={area.id} className="area-tile"><MapPinned className="h-5 w-5" /><div><strong>{area.name}</strong><span>{groups.filter((g) => g.area_id === area.id).length} מקבצים · {specs.filter((s) => s.area_id === area.id).length} פרטי מפרט</span></div></div>)}
          {!areas.length && <Empty text="עדיין לא הוגדרו אזורים בפרויקט." />}
        </div>
      </section>

      <section className="control-section">
        <header><div><span className="eyebrow">השלמה מרוכזת</span><h2>שיוך משימות</h2></div><p>הקליטה נשארת מהירה בשטח; כאן משלימים אזור ומקבץ לכמה משימות יחד.</p></header>
        <div className="mb-4 grid gap-3 lg:grid-cols-[220px_220px_auto_1fr]">
          <select value={bulkArea} onChange={(e) => setBulkArea(e.target.value)} className="field-control"><option value="">בחר אזור</option><option value="none">הסר שיוך אזור</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select value={bulkGroup} onChange={(e) => setBulkGroup(e.target.value)} className="field-control"><option value="">בחר מקבץ</option><option value="none">הסר שיוך מקבץ</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
          <Button onClick={applyBulkAssignment} disabled={busy === "bulk" || !selectedTasks.size || (!bulkArea && !bulkGroup)}>שייך {selectedTasks.size || ""} משימות</Button>
          <span className="self-center text-xs text-neutral-500">בחירה אינה משנה יעד או אחראי.</span>
        </div>
        <div className="max-h-80 divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
          {tasks.map((task) => <label key={task.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-neutral-50"><input type="checkbox" checked={selectedTasks.has(task.id)} onChange={(e) => setSelectedTasks((current) => { const next = new Set(current); if (e.target.checked) next.add(task.id); else next.delete(task.id); return next; })} className="h-4 w-4 accent-[var(--color-brand-blue)]" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span><span className="hidden text-xs text-neutral-500 sm:block">{task.area_id ? areaNameById.get(task.area_id) : "ללא אזור"}</span><span className="status-chip">{task.status === "completed" ? "בוצע" : task.status === "blocked" ? "חסום" : "פתוח"}</span></label>)}
          {!tasks.length && <Empty text="אין משימות בפרויקט." />}
        </div>
      </section>

      <section className="control-section">
        <header><div><span className="eyebrow">ביצוע</span><h2>מקבצי עבודה</h2></div><p>כמה משימות סביב עבודה אחת, בלי להפוך כל משלוח תמונות לשיחה.</p></header>
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="שם המקבץ" className="field-control" />
          <select value={groupArea} onChange={(event) => setGroupArea(event.target.value)} className="field-control"><option value="">כל הפרויקט / טרם שויך</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <Button onClick={addGroup} disabled={busy === "group" || !groupTitle.trim()}><Plus className="h-4 w-4" />צור מקבץ</Button>
        </div>
        <div className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {groups.map((group) => <div key={group.id} className="flex items-center justify-between gap-4 p-4"><div><strong className="block">{group.title}</strong><span className="text-xs text-neutral-500">{group.area_id ? areaNameById.get(group.area_id) : "טרם שויך לאזור"}</span></div><span className="status-chip">{group.status === "completed" ? "הושלם" : group.status === "blocked" ? "חסום" : "פעיל"}</span></div>)}
          {!groups.length && <Empty text="מקבצים יופיעו כאן אחרי יצירה ידנית או קליטה." />}
        </div>
      </section>

      <section className="control-section">
        <header><div><span className="eyebrow">ראיות מהשטח</span><h2>מדיה אחרונה</h2></div><p>כל קובץ נשמר עם מקור, זמן וקישור למשימה כאשר נוצרה.</p></header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{media.slice(0, 12).map((item) => <a key={item.id} href={item.file_url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border border-neutral-200 p-4 hover:border-[var(--color-brand-blue)]/40"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-600 group-hover:bg-[var(--color-brand-blue)] group-hover:text-white"><ImageIcon className="h-5 w-5" /></span><div className="min-w-0"><strong className="block truncate text-sm">{item.caption || (item.media_type === "video" ? "סרטון מהשטח" : "צילום מהשטח")}</strong><span className="text-xs text-neutral-500">{new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.captured_at))} · פתח קובץ</span></div></a>)}{!media.length && <Empty text="עדיין לא נקלטה מדיה לפרויקט." />}</div>
      </section>

      <section className="control-section">
        <header><div><span className="eyebrow">מקור מחייב</span><h2>מפרט והחלטות</h2></div><p>טיוטה נשמרת מיד. ערך מחייב דורש מקור ושני אישורים.</p></header>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_210px_auto]">
          <input value={specLabel} onChange={(event) => setSpecLabel(event.target.value)} placeholder="פרט, חומר או גוון" className="field-control" />
          <input value={specValue} onChange={(event) => setSpecValue(event.target.value)} placeholder="הערך שנבחר" className="field-control" />
          <select value={specArea} onChange={(event) => setSpecArea(event.target.value)} className="field-control"><option value="">כל הפרויקט</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <Button onClick={addSpec} disabled={busy === "spec" || !specLabel.trim() || !specValue.trim()}><Plus className="h-4 w-4" />שמור טיוטה</Button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {specs.map((spec) => <Card key={spec.id}><CardContent className="p-4"><div className="flex items-start justify-between gap-4"><div><span className="text-xs text-neutral-500">{spec.area_id ? areaNameById.get(spec.area_id) : "כל הפרויקט"} · גרסה {spec.revision}</span><h3 className="mt-1 font-semibold">{spec.label}</h3><p className="mt-1 text-lg text-[var(--color-brand-blue)]">{spec.value}{spec.unit ? ` ${spec.unit}` : ""}</p></div>{spec.status === "confirmed" ? <span className="status-chip status-chip-success"><CheckCircle2 className="h-3.5 w-3.5" />מאושר</span> : <span className="status-chip"><FileCheck2 className="h-3.5 w-3.5" />טיוטה</span>}</div></CardContent></Card>)}
          {!specs.length && <Empty text="אין עדיין מפרט. אפשר להתחיל מפרט אחד חשוב בפרויקט הפיילוט." />}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof MapPinned; value: number; label: string }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)]"><Icon className="h-5 w-5" /></span><div><strong className="block text-2xl">{value}</strong><span className="text-sm text-neutral-500">{label}</span></div></CardContent></Card>;
}

function Empty({ text }: { text: string }) { return <div className="p-5 text-sm text-neutral-500">{text}</div>; }
