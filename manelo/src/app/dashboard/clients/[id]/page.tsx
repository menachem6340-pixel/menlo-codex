import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, Phone, Mail, MapPin, Building, FileText, Briefcase } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("type", "client")
    .single();

  if (!client) notFound();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, quote_number, title, status, total_amount, issue_date")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={client.name}
        description={client.contact_person || "פרטי לקוח"}
        action={
          <Link href="/dashboard/clients">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה לרשימה
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* פרטים */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>פרטי קשר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-neutral-400" />
                <a href={`tel:${client.phone}`} dir="ltr" className="text-[var(--color-brand-blue)] hover:underline">
                  {client.phone}
                </a>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-neutral-400" />
                <a href={`mailto:${client.email}`} dir="ltr" className="text-[var(--color-brand-blue)] hover:underline">
                  {client.email}
                </a>
              </div>
            )}
            {(client.address || client.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-neutral-400 mt-0.5" />
                <span>
                  {[client.address, client.city].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {client.business_id && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-neutral-400" />
                <span dir="ltr">{client.business_id}</span>
              </div>
            )}
            {client.notes && (
              <div className="pt-3 border-t border-neutral-200">
                <div className="text-xs font-medium text-neutral-500 mb-1">הערות</div>
                <p className="text-neutral-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* פרויקטים והצעות */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                פרויקטים ({projects?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!projects || projects.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">
                  אין פרויקטים ללקוח זה עדיין
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/projects/${p.id}`}
                      className="block p-3 rounded-lg border border-neutral-200 hover:border-[var(--color-brand-yellow)] hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          {p.address && (
                            <div className="text-xs text-neutral-500 truncate">{p.address}</div>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 shrink-0">
                          {translateProjectStatus(p.status)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                הצעות מחיר ({quotes?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!quotes || quotes.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">
                  אין הצעות מחיר ללקוח זה עדיין
                </p>
              ) : (
                <div className="space-y-2">
                  {quotes.map((q) => (
                    <Link
                      key={q.id}
                      href={`/dashboard/quotes/${q.id}`}
                      className="block p-3 rounded-lg border border-neutral-200 hover:border-[var(--color-brand-yellow)] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            <span dir="ltr">#{q.quote_number}</span> · {q.title}
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <div className="font-semibold text-[var(--color-brand-blue)]">
                            {formatCurrency(q.total_amount || 0)}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {translateQuoteStatus(q.status)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function translateProjectStatus(s: string): string {
  return {
    lead: "ליד",
    quoted: "הצעת מחיר",
    active: "פעיל",
    paused: "מושהה",
    completed: "הושלם",
    cancelled: "בוטל",
  }[s] || s;
}

function translateQuoteStatus(s: string): string {
  return {
    draft: "טיוטה",
    sent: "נשלח",
    approved: "אושר",
    rejected: "נדחה",
    expired: "פג תוקף",
  }[s] || s;
}
