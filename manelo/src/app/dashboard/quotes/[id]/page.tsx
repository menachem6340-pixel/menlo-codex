import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteRecordButton } from "@/components/actions/delete-record-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowRight, Download } from "lucide-react";
import { WhatsAppShareButton } from "@/components/quotes/whatsapp-share";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusLabels: Record<string, string> = {
  draft: "טיוטה",
  sent: "נשלח",
  approved: "אושר",
  rejected: "נדחה",
  expired: "פג תוקף",
};

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select(`
      *,
      client:contacts(id, name, phone, email, address, city, business_id),
      project:projects(id, name, address),
      organization:organizations(name, business_id, address, phone, email)
    `)
    .eq("id", id)
    .single();

  if (!quote) notFound();

  const { data: items } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id)
    .order("display_order");

  const client = quote.client as {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    business_id?: string;
  } | null;
  const org = quote.organization as { name: string } | null;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={`הצעה #${quote.quote_number}`}
        description={quote.title}
        action={
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/quotes">
              <Button variant="outline" size="sm">
                <ArrowRight className="h-4 w-4" />
                חזרה
              </Button>
            </Link>
            <WhatsAppShareButton
              quoteId={id}
              quoteNumber={quote.quote_number}
              clientPhone={client?.phone}
              clientName={client?.name}
              total={quote.total_amount}
              orgName={org?.name}
            />
            <a
              href={`/api/quotes/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm">
                <Download className="h-4 w-4" />
                הורד PDF
              </Button>
            </a>
            <DeleteRecordButton id={id} type="quote" redirectTo="/dashboard/quotes" />
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="לקוח" value={client?.name || "—"} />
          <Stat label="תאריך" value={formatDate(quote.issue_date)} />
          <Stat
            label="תוקף עד"
            value={quote.valid_until ? formatDate(quote.valid_until) : "—"}
          />
          <Stat label="סטטוס" value={statusLabels[quote.status] || quote.status} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>פריטים</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: "600px" }}>
            <thead>
              <tr className="border-b-2 border-neutral-300">
                <th className="text-right py-3 px-2 font-medium">#</th>
                <th className="text-right py-3 px-2 font-medium">תיאור</th>
                <th className="text-right py-3 px-2 font-medium w-20">יחידה</th>
                <th className="text-right py-3 px-2 font-medium w-24">כמות</th>
                <th className="text-right py-3 px-2 font-medium w-28">מחיר ליח&apos;</th>
                <th className="text-right py-3 px-2 font-medium w-28">סה&quot;כ</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((it, i) => (
                <tr key={it.id} className="border-b border-neutral-100">
                  <td className="py-3 px-2 text-neutral-500">{i + 1}</td>
                  <td className="py-3 px-2">{it.description}</td>
                  <td className="py-3 px-2">{it.unit}</td>
                  <td className="py-3 px-2 ltr-numbers">{it.quantity}</td>
                  <td className="py-3 px-2 ltr-numbers">{formatCurrency(it.unit_price)}</td>
                  <td className="py-3 px-2 font-medium ltr-numbers">
                    {formatCurrency(it.total_price || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>תנאים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {quote.payment_terms && (
              <div>
                <div className="font-medium text-neutral-500 mb-1">תנאי תשלום</div>
                <p>{quote.payment_terms}</p>
              </div>
            )}
            {quote.notes && (
              <div>
                <div className="font-medium text-neutral-500 mb-1">הערות</div>
                <p className="whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[var(--color-brand-yellow)]/10 to-[var(--color-brand-blue)]/5">
          <CardHeader>
            <CardTitle>סיכום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <Row label="סה״כ פריטים" value={formatCurrency(quote.subtotal || 0)} />
              {quote.discount_amount > 0 && (
                <Row
                  label={`הנחה ${quote.discount_pct ? `(${quote.discount_pct}%)` : ""}`}
                  value={`-${formatCurrency(quote.discount_amount)}`}
                  muted
                />
              )}
              <Row
                label={`מע״מ (${quote.vat_rate}%)`}
                value={formatCurrency(quote.vat_amount || 0)}
                muted
              />
              <div className="border-t-2 border-neutral-300 mt-3 pt-3 flex justify-between font-bold text-lg">
                <span>סה״כ לתשלום</span>
                <span className="text-[var(--color-brand-blue)] ltr-numbers">
                  {formatCurrency(quote.total_amount || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-neutral-600" : ""}`}>
      <span>{label}</span>
      <span className="ltr-numbers">{value}</span>
    </div>
  );
}
