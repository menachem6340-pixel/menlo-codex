import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createElement } from "react";
import fs from "fs";
import path from "path";

// רושם פונט עברי - אם קיים מקומית. בענן ניפול לפונט ברירת מחדל.
const fontPath = path.join(process.cwd(), "public", "fonts", "Heebo.ttf");
const pdfFontFamily = fs.existsSync(fontPath) ? "Heebo" : "Helvetica";

if (fs.existsSync(fontPath)) {
  Font.register({
    family: "Heebo",
    src: fontPath,
  });
}

const styles = StyleSheet.create({
  page: {
    // padding מותאם להופיע על בלאנק - שוליים גדולים בראש ובסוף
    paddingTop: 130,
    paddingBottom: 100,
    paddingHorizontal: 50,
    fontFamily: pdfFontFamily,
    fontSize: 10,
    color: "#1A1A1A",
    direction: "rtl",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "right",
    color: "#3A3A3A",
    marginBottom: 4,
  },
  quoteNumber: {
    fontSize: 11,
    textAlign: "right",
    color: "#2B7FBF",
    marginBottom: 16,
  },
  metaGrid: {
    flexDirection: "row-reverse",
    backgroundColor: "#FAFAFA",
    padding: 12,
    borderRadius: 6,
    marginBottom: 18,
    gap: 20,
  },
  metaCol: { flex: 1, textAlign: "right" },
  metaLabel: { fontSize: 8, color: "#888", marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 700, color: "#1A1A1A" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#3A3A3A",
    marginBottom: 8,
    textAlign: "right",
  },
  table: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 4,
    marginBottom: 16,
  },
  thead: {
    flexDirection: "row-reverse",
    backgroundColor: "#F5C842",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  th: {
    fontWeight: 700,
    fontSize: 9,
    color: "#1A1A1A",
    textAlign: "right",
  },
  tr: {
    flexDirection: "row-reverse",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  trZebra: { backgroundColor: "#FAFAFA" },
  td: { fontSize: 9, textAlign: "right" },
  colNum: { width: 24 },
  colDesc: { flex: 1, paddingHorizontal: 4 },
  colUnit: { width: 50, textAlign: "center" },
  colQty: { width: 50, textAlign: "left" },
  colPrice: { width: 70, textAlign: "left" },
  colTotal: { width: 80, textAlign: "left", fontWeight: 700 },
  totalsBox: {
    marginTop: 10,
    alignSelf: "flex-start",
    width: 240,
    padding: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalRowFinal: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: "#3A3A3A",
  },
  totalLabel: { fontSize: 10 },
  totalValue: { fontSize: 10, fontWeight: 700 },
  totalFinalLabel: { fontSize: 12, fontWeight: 700 },
  totalFinalValue: { fontSize: 14, fontWeight: 700, color: "#2B7FBF" },
  notesBox: {
    marginTop: 18,
    padding: 12,
    backgroundColor: "#FFF9E6",
    borderRightWidth: 3,
    borderRightColor: "#F5C842",
  },
  notesTitle: { fontWeight: 700, marginBottom: 4, fontSize: 10 },
  notesText: { fontSize: 9, lineHeight: 1.5, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 8,
  },
});

interface QuoteData {
  quote_number: string;
  title: string;
  issue_date: string;
  valid_until?: string;
  subtotal: number;
  discount_pct: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  payment_terms?: string;
  notes?: string;
  client?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    business_id?: string;
  } | null;
  organization?: {
    name: string;
    business_id?: string;
    address?: string;
    phone?: string;
    email?: string;
  } | null;
  project?: { name: string; address?: string } | null;
}

interface QuoteItem {
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(v || 0);

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("he-IL").format(new Date(d));

function QuoteDocument({ quote, items }: { quote: QuoteData; items: QuoteItem[] }) {
  return createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", style: styles.page },

      // Title - הלוגו ופרטי העסק כבר ברקע (הבלאנק)
      createElement(Text, { style: styles.title }, "הצעת מחיר"),
      createElement(Text, { style: styles.quoteNumber }, `מס' ${quote.quote_number}`),
      createElement(Text, { style: { fontSize: 12, marginBottom: 12, textAlign: "right", fontWeight: 700 } }, quote.title),

      // Meta grid
      createElement(
        View,
        { style: styles.metaGrid },
        createElement(
          View,
          { style: styles.metaCol },
          createElement(Text, { style: styles.metaLabel }, "לכבוד"),
          createElement(Text, { style: styles.metaValue }, quote.client?.name || "—"),
          quote.client?.phone &&
            createElement(Text, { style: { fontSize: 8, color: "#666" } }, quote.client.phone),
          quote.client?.address &&
            createElement(
              Text,
              { style: { fontSize: 8, color: "#666" } },
              [quote.client.address, quote.client.city].filter(Boolean).join(", ")
            )
        ),
        createElement(
          View,
          { style: styles.metaCol },
          createElement(Text, { style: styles.metaLabel }, "תאריך"),
          createElement(Text, { style: styles.metaValue }, fmtDate(quote.issue_date))
        ),
        quote.valid_until &&
          createElement(
            View,
            { style: styles.metaCol },
            createElement(Text, { style: styles.metaLabel }, "תוקף עד"),
            createElement(Text, { style: styles.metaValue }, fmtDate(quote.valid_until))
          ),
        quote.project &&
          createElement(
            View,
            { style: styles.metaCol },
            createElement(Text, { style: styles.metaLabel }, "פרויקט"),
            createElement(Text, { style: styles.metaValue }, quote.project.name)
          )
      ),

      // Table
      createElement(Text, { style: styles.sectionTitle }, "פירוט עבודות"),
      createElement(
        View,
        { style: styles.table },
        createElement(
          View,
          { style: styles.thead },
          createElement(Text, { style: [styles.th, styles.colNum] }, "#"),
          createElement(Text, { style: [styles.th, styles.colDesc] }, "תיאור"),
          createElement(Text, { style: [styles.th, styles.colUnit] }, "יח'"),
          createElement(Text, { style: [styles.th, styles.colQty] }, "כמות"),
          createElement(Text, { style: [styles.th, styles.colPrice] }, "מחיר"),
          createElement(Text, { style: [styles.th, styles.colTotal] }, 'סה"כ')
        ),
        ...items.map((it, i) =>
          createElement(
            View,
            { key: i, style: [styles.tr, ...(i % 2 === 0 ? [styles.trZebra] : [])] },
            createElement(Text, { style: [styles.td, styles.colNum] }, `${i + 1}`),
            createElement(Text, { style: [styles.td, styles.colDesc] }, it.description),
            createElement(Text, { style: [styles.td, styles.colUnit] }, it.unit),
            createElement(Text, { style: [styles.td, styles.colQty] }, `${it.quantity}`),
            createElement(Text, { style: [styles.td, styles.colPrice] }, fmtCurrency(it.unit_price)),
            createElement(Text, { style: [styles.td, styles.colTotal] }, fmtCurrency(it.total_price))
          )
        )
      ),

      // Totals
      createElement(
        View,
        { style: styles.totalsBox },
        createElement(
          View,
          { style: styles.totalRow },
          createElement(Text, { style: styles.totalLabel }, "סה״כ פריטים"),
          createElement(Text, { style: styles.totalValue }, fmtCurrency(quote.subtotal))
        ),
        quote.discount_amount > 0 &&
          createElement(
            View,
            { style: styles.totalRow },
            createElement(Text, { style: styles.totalLabel }, `הנחה ${quote.discount_pct}%`),
            createElement(Text, { style: styles.totalValue }, `-${fmtCurrency(quote.discount_amount)}`)
          ),
        createElement(
          View,
          { style: styles.totalRow },
          createElement(Text, { style: styles.totalLabel }, `מע״מ ${quote.vat_rate}%`),
          createElement(Text, { style: styles.totalValue }, fmtCurrency(quote.vat_amount))
        ),
        createElement(
          View,
          { style: styles.totalRowFinal },
          createElement(Text, { style: styles.totalFinalLabel }, "סה״כ לתשלום"),
          createElement(Text, { style: styles.totalFinalValue }, fmtCurrency(quote.total_amount))
        )
      ),

      // Notes
      quote.payment_terms &&
        createElement(
          View,
          { style: styles.notesBox },
          createElement(Text, { style: styles.notesTitle }, "תנאי תשלום"),
          createElement(Text, { style: styles.notesText }, quote.payment_terms)
        ),
      quote.notes &&
        createElement(
          View,
          { style: styles.notesBox },
          createElement(Text, { style: styles.notesTitle }, "הערות"),
          createElement(Text, { style: styles.notesText }, quote.notes)
        ),

      // אין footer פנימי - הבלאנק כולל פוטר משלו
    )
  );
}

export async function renderQuotePdf(params: {
  quote: QuoteData;
  items: QuoteItem[];
}) {
  return await renderToBuffer(QuoteDocument(params));
}
