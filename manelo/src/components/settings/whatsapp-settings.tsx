"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus, Trash2 } from "lucide-react";

type Channel = { id: string; chat_id: string; chat_name?: string | null; project_id: string; project?: { name: string } | { name: string }[] | null };
type Project = { id: string; name: string };

export function WhatsAppSettings({ organizationId, channels, projects }: { organizationId: string; channels: Channel[]; projects: Project[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [chatId, setChatId] = useState("");
  const [chatName, setChatName] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    if (!chatId.trim() || !projectId) return;
    setBusy(true); setMessage(null);
    const { error } = await supabase.from("whatsapp_project_channels").insert({ organization_id: organizationId, project_id: projectId, chat_id: chatId.trim(), chat_name: chatName.trim() || null });
    setBusy(false);
    if (error) return setMessage(`לא נשמר: ${error.message}`);
    setChatId(""); setChatName(""); setMessage("הקבוצה חוברה לפרויקט"); router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    const { error } = await supabase.from("whatsapp_project_channels").delete().eq("id", id);
    setBusy(false);
    setMessage(error ? `לא ניתן להסיר: ${error.message}` : "החיבור הוסר");
    if (!error) router.refresh();
  }

  return <div className="space-y-4">
    <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900"><strong>איך זה עובד:</strong> ההודעה „משימה” פותחת חלון קליטה של שתי דקות. כל תמונה או סרטון שנשלחים אחריה נשמרים כמשימות נפרדות באותו מקבץ. מדיה רגילה נשמרת בגלריית הפרויקט.</div>
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <input className="field-control" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="מזהה הקבוצה מ-Green API" dir="ltr" />
      <input className="field-control" value={chatName} onChange={(e) => setChatName(e.target.value)} placeholder="שם הקבוצה" />
      <select className="field-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">בחר פרויקט</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <Button onClick={add} disabled={busy || !chatId.trim() || !projectId}><Plus className="h-4 w-4" />חבר</Button>
    </div>
    {message && <p role="status" className="text-sm font-medium text-neutral-700">{message}</p>}
    <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
      {channels.map((channel) => { const project = Array.isArray(channel.project) ? channel.project[0] : channel.project; return <div key={channel.id} className="flex items-center justify-between gap-4 p-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><MessageCircle className="h-5 w-5" /></span><div className="min-w-0"><strong className="block truncate text-sm">{channel.chat_name || channel.chat_id}</strong><span className="block truncate text-xs text-neutral-500">{project?.name || "פרויקט"} · {channel.chat_id}</span></div></div><Button variant="ghost" size="icon" onClick={() => remove(channel.id)} disabled={busy} aria-label="הסר חיבור"><Trash2 className="h-4 w-4 text-red-600" /></Button></div>; })}
      {!channels.length && <p className="p-5 text-sm text-neutral-500">עדיין לא חוברו קבוצות לפרויקטים.</p>}
    </div>
  </div>;
}

