import { createClient } from "@/lib/supabase/server";
import { renderQuotePdf } from "@/lib/pdf/quote-pdf";
import { mergeWithLetterhead } from "@/lib/pdf/merge-letterhead";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select(`
      *,
      client:contacts(name, phone, email, address, city, business_id),
      project:projects(name, address),
      organization:organizations(name, business_id, address, phone, email)
    `)
    .eq("id", id)
    .single();

  if (!quote) {
    return new Response("הצעת מחיר לא נמצאה", { status: 404 });
  }

  const { data: items } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id)
    .order("display_order");

  const buffer = await renderQuotePdf({
    quote,
    items: items || [],
  });

  // מזג עם הבלאנק של העסק (אם קיים)
  const finalBuffer = await mergeWithLetterhead(buffer);

  return new Response(finalBuffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="quote-${quote.quote_number}.pdf"`,
    },
  });
}

export const runtime = "nodejs";
