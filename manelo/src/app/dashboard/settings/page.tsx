import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Settings as SettingsIcon } from "lucide-react";
import { WhatsAppSettings } from "@/components/settings/whatsapp-settings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(*)")
    .eq("id", user!.id)
    .single();

  const org = profile?.organization as { name: string; vat_rate: number; brand_color: string } | null;
  const [{ data: projects }, { data: whatsappChannels }] = await Promise.all([
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("whatsapp_project_channels").select("id, chat_id, chat_name, project_id, project:projects(name)").eq("is_active", true).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="הגדרות" description="הגדרות העסק והמשתמש" />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            פרטי המשתמש
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="שם מלא" value={profile?.full_name} />
          <Row label="אימייל" value={user?.email} dir="ltr" />
          <Row label="תפקיד" value={translateRole(profile?.role)} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>פרטי העסק</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="שם העסק" value={org?.name} />
          <Row label="מע״מ" value={`${org?.vat_rate ?? 18}%`} />
          <Row label="צבע מותג" value={org?.brand_color || "—"} />
        </CardContent>
      </Card>

      {profile?.organization_id && (
        <Card>
          <CardHeader><CardTitle>קליטת WhatsApp לפרויקטים</CardTitle></CardHeader>
          <CardContent>
            <WhatsAppSettings organizationId={profile.organization_id} projects={projects || []} channels={whatsappChannels || []} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function Row({ label, value, dir }: { label: string; value?: string | null; dir?: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-100 pb-2 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium" dir={dir}>{value || "—"}</span>
    </div>
  );
}

function translateRole(r?: string) {
  return { owner: "בעלים", office: "צוות משרד", field_worker: "עובד שטח", client: "לקוח" }[r || ""] || r;
}
