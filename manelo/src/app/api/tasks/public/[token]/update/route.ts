import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    progress_pct?: number;
  };
  const progress = Number(body.progress_pct);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("public_update_task", {
    p_token: token,
    p_status: body.status || null,
    p_progress_pct: Number.isFinite(progress) ? progress : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
