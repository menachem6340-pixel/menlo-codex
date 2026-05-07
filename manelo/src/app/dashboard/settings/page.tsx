import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Settings as SettingsIcon } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(*)")
    .eq("id", user!.id)
    .single();

  const org = profile?.organization as { name: string; vat_rate: number; brand_color: string } | null;

  return (
    <div className="max-w-3xl mx-auto">
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

      <Card>
        <CardHeader>
          <CardTitle>פרטי העסק</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="שם העסק" value={org?.name} />
          <Row label="מע״מ" value={`${org?.vat_rate ?? 18}%`} />
          <Row label="צבע מותג" value={org?.brand_color || "—"} />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-neutral-400 mt-6">
        עריכת הגדרות מתקדמת תתווסף בשלב הבא
      </p>
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
