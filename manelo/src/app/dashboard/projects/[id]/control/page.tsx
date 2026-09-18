import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectControlCenter } from "@/components/projects/project-control-center";

interface PageProps { params: Promise<{ id: string }> }

export default async function ProjectControlPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: areas }, { data: groups }, { data: specs }, { data: tasks }, { data: media }] = await Promise.all([
    supabase.from("projects").select("id, name, organization_id, address").eq("id", id).single(),
    supabase.from("project_areas").select("id, name, description, sort_order").eq("project_id", id).order("sort_order"),
    supabase.from("task_groups").select("id, title, status, area_id, target_date").eq("project_id", id).neq("status", "archived").order("created_at", { ascending: false }),
    supabase.from("project_specs").select("id, label, value, unit, status, area_id, revision, source_note").eq("project_id", id).neq("status", "superseded").order("updated_at", { ascending: false }),
    supabase.from("tasks").select("id, title, status, area_id, task_group_id").eq("project_id", id).order("updated_at", { ascending: false }),
    supabase.from("project_media").select("id, file_url, media_type, caption, captured_at, task_id").eq("project_id", id).order("captured_at", { ascending: false }).limit(30),
  ]);
  if (!project) notFound();

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><Link href={`/dashboard/projects/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-[var(--color-brand-blue)]"><ArrowRight className="h-4 w-4" />חזרה לפרויקט</Link><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-brand-dark)] text-white"><Building2 className="h-6 w-6" /></span><div><span className="eyebrow">מרכז בקרת פרויקט</span><h1 className="text-3xl font-bold">{project.name}</h1></div></div>{project.address && <p className="mt-2 text-sm text-neutral-500">{project.address}</p>}</div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>כלל עבודה:</strong> קליטה שקטה בשטח, השלמה מרוכזת במשרד.</div>
    </div>
    <ProjectControlCenter projectId={id} organizationId={project.organization_id} areas={areas || []} groups={groups || []} specs={specs || []} tasks={tasks || []} media={media || []} />
  </div>;
}
