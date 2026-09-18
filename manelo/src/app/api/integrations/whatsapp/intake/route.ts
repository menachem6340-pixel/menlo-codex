import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Json = Record<string, unknown>;

export async function POST(request: Request) {
  const expectedSecret = process.env.MENLO_WHATSAPP_WEBHOOK_SECRET;
  const suppliedSecret = request.headers.get("x-menlo-webhook-secret") || new URL(request.url).searchParams.get("token");
  if (!expectedSecret || !safeEqual(suppliedSecret, expectedSecret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = (await request.json().catch(() => null)) as Json | null;
  if (!payload) return NextResponse.json({ error: "invalid json" }, { status: 400 });
  const event = normalize(payload);
  if (!event.id || !event.chatId) return NextResponse.json({ ok: true, ignored: "unsupported event" });

  const supabase = createAdminClient();
  const { data: existing } = await supabase.from("integration_events").select("id, status").eq("provider", "green-api").eq("external_event_id", event.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  const { data: channel } = await supabase.from("whatsapp_project_channels").select("organization_id, project_id").eq("chat_id", event.chatId).eq("is_active", true).maybeSingle();
  const { data: storedEvent, error: eventError } = await supabase.from("integration_events").insert({ provider: "green-api", external_event_id: event.id, organization_id: channel?.organization_id || null, payload, status: channel ? "received" : "ignored" }).select("id").single();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  if (!channel) return NextResponse.json({ ok: true, ignored: "chat is not mapped" });

  try {
    if (event.text.startsWith("אזורים:")) {
      const names = event.text.slice("אזורים:".length).split(/[,،\n]/).map((name) => name.trim()).filter(Boolean).slice(0, 30);
      if (names.length) await supabase.from("project_areas").upsert(names.map((name, index) => ({ organization_id: channel.organization_id, project_id: channel.project_id, name, sort_order: index })), { onConflict: "project_id,name", ignoreDuplicates: true });
      await finish(supabase, storedEvent.id, "processed");
      return NextResponse.json({ ok: true, action: "areas_saved", count: names.length });
    }

    if (/^משימה(?:\s*[:\-].*)?$/u.test(event.text)) {
      const title = event.text.replace(/^משימה\s*[:\-]?\s*/u, "").trim() || `מקבץ שטח ${new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(new Date())}`;
      const { data: group, error } = await supabase.from("task_groups").insert({ organization_id: channel.organization_id, project_id: channel.project_id, title, source: "whatsapp" }).select("id").single();
      if (error) throw error;
      await supabase.from("whatsapp_capture_sessions").insert({ organization_id: channel.organization_id, project_id: channel.project_id, chat_id: event.chatId, sender_id: event.senderId, task_group_id: group.id, expires_at: new Date(Date.now() + 2 * 60_000).toISOString() });
      await finish(supabase, storedEvent.id, "processed");
      return NextResponse.json({ ok: true, action: "capture_started", expires_in_seconds: 120 });
    }

    if (event.fileUrl && event.mediaType) {
      const { data: session } = await supabase.from("whatsapp_capture_sessions").select("task_group_id").eq("chat_id", event.chatId).gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: false }).limit(1).maybeSingle();
      let taskId: string | null = null;
      if (session?.task_group_id) {
        const { data: task, error } = await supabase.from("tasks").insert({ organization_id: channel.organization_id, project_id: channel.project_id, task_group_id: session.task_group_id, title: event.caption || mediaTitle(event.mediaType), description: event.caption || null, intake_source: "whatsapp", source_message_id: event.id }).select("id").single();
        if (error) throw error;
        taskId = task.id;
      }
      const { error: mediaError } = await supabase.from("project_media").insert({ organization_id: channel.organization_id, project_id: channel.project_id, task_id: taskId, file_url: event.fileUrl, media_type: event.mediaType, caption: event.caption || null, source_message_id: event.id, captured_by: event.senderName || event.senderId });
      if (mediaError) throw mediaError;
      await finish(supabase, storedEvent.id, "processed");
      return NextResponse.json({ ok: true, action: taskId ? "task_created" : "media_saved", task_id: taskId });
    }

    await finish(supabase, storedEvent.id, "ignored");
    return NextResponse.json({ ok: true, ignored: "no supported command or media" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "intake failed";
    await supabase.from("integration_events").update({ status: "failed", error_message: message, processed_at: new Date().toISOString() }).eq("id", storedEvent.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalize(payload: Json) {
  const senderData = object(payload.senderData);
  const messageData = object(payload.messageData);
  const textData = object(messageData.textMessageData);
  const extendedData = object(messageData.extendedTextMessageData);
  const fileData = object(messageData.fileMessageData);
  const type = string(messageData.typeMessage);
  return {
    id: string(payload.idMessage) || string(payload.id) || string(payload.receiptId),
    chatId: string(senderData.chatId) || string(payload.chatId),
    senderId: string(senderData.sender) || string(senderData.senderId),
    senderName: string(senderData.senderName),
    text: string(textData.textMessage) || string(extendedData.text) || string(payload.text),
    caption: string(fileData.caption) || string(payload.caption),
    fileUrl: string(fileData.downloadUrl) || string(fileData.urlFile) || string(payload.fileUrl),
    mediaType: type.includes("image") ? "image" : type.includes("video") ? "video" : type.includes("audio") ? "audio" : string(payload.mediaType),
  };
}

function object(value: unknown): Json { return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {}; }
function string(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function safeEqual(value: string | null, expected: string) { if (!value) return false; const a = Buffer.from(value); const b = Buffer.from(expected); return a.length === b.length && timingSafeEqual(a, b); }
function mediaTitle(type: string) { return type === "video" ? "עדכון וידאו מהשטח" : type === "audio" ? "עדכון קולי מהשטח" : "עדכון מצולם מהשטח"; }
async function finish(supabase: ReturnType<typeof createAdminClient>, id: string, status: "processed" | "ignored") { await supabase.from("integration_events").update({ status, processed_at: new Date().toISOString() }).eq("id", id); }

