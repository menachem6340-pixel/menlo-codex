import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Plus, Phone, Mail, MapPin, Upload, MessageCircle } from "lucide-react";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("contacts")
    .select("*")
    .eq("type", "client")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="לקוחות"
        description="ניהול הלקוחות של העסק"
        action={
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/clients/whatsapp-import">
              <Button variant="outline" size="sm">
                <MessageCircle className="h-4 w-4" />
                מוואטסאפ
              </Button>
            </Link>
            <Link href="/dashboard/clients/import">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" />
                יבוא Excel
              </Button>
            </Link>
            <Link href="/dashboard/clients/new">
              <Button>
                <Plus className="h-4 w-4" />
                לקוח חדש
              </Button>
            </Link>
          </div>
        }
      />

      {!clients || clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="עדיין אין לקוחות"
          description="הוסף את הלקוח הראשון שלך כדי להתחיל לנהל פרויקטים והצעות מחיר"
          action={
            <Link href="/dashboard/clients/new">
              <Button>
                <Plus className="h-4 w-4" />
                הוסף לקוח ראשון
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Link key={c.id} href={`/dashboard/clients/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-[var(--color-brand-yellow)]/30 flex items-center justify-center text-lg font-bold text-[var(--color-brand-dark)]">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[var(--color-brand-dark)] truncate">
                      {c.name}
                    </h3>
                    {c.contact_person && (
                      <p className="text-sm text-neutral-500 truncate">
                        {c.contact_person}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-neutral-600">
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span dir="ltr" className="truncate">{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span dir="ltr" className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.city}</span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
