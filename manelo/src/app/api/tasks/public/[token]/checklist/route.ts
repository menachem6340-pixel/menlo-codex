import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    item_id?: string;
    is_done?: boolean;
  };

  if (!body.item_id) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_update_task_checklist", {
    p_token: token,
    p_item_id: body.item_id,
    p_is_done: Boolean(body.is_done),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
