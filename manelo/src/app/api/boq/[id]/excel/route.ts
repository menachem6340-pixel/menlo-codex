import { createClient } from "@/lib/supabase/server";
import { buildBoqExcel } from "@/lib/boq/excel-export";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: boq } = await supabase
    .from("boqs")
    .select(`
      *,
      project:projects(name, address, client:contacts(name, phone)),
      organization:organizations(name, business_id, phone, email, address)
    `)
    .eq("id", id)
    .single();

  if (!boq) {
    return new Response("כתב כמויות לא נמצא", { status: 404 });
  }

  const [{ data: sections }, { data: items }] = await Promise.all([
    supabase.from("boq_sections").select("*").eq("boq_id", id).order("display_order"),
    supabase.from("boq_items").select("*").eq("boq_id", id).order("display_order"),
  ]);

  const project = boq.project as { name: string; address?: string; client?: { name: string; phone?: string } | null } | null;

  const buffer = await buildBoqExcel({
    boq: { name: boq.name, created_at: boq.created_at },
    project: project ? { name: project.name, address: project.address } : null,
    client: project?.client || null,
    organization: boq.organization || { name: "מנלו בנייה" },
    sections: sections || [],
    items: items || [],
  });

  const safeName = boq.name.replace(/[^\w֐-׿\s-]/g, "").substring(0, 50);
  return new Response(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeName + ".xlsx")}`,
    },
  });
}

export const runtime = "nodejs";
