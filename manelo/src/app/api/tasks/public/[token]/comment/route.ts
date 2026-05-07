import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    body?: string;
    author_name?: string;
  };

  if (!body.body?.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_add_task_comment", {
    p_token: token,
    p_author_name: body.author_name || "גורם מטפל",
    p_body: body.body,
    p_attachments: [],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
