"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface WhatsAppShareButtonProps {
  quoteId: string;
  quoteNumber: string;
  clientPhone?: string | null;
  clientName?: string | null;
  total: number;
  orgName?: string | null;
}

export function WhatsAppShareButton(props: WhatsAppShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(props.clientPhone || "");
  const [message, setMessage] = useState(buildDefaultMessage(props));

  function shareToWhatsApp() {
    // נקה את הטלפון - השאר רק ספרות, הוסף 972 אם ישראלי
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "972" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("972") && cleanPhone.length === 9) {
      cleanPhone = "972" + cleanPhone;
    }

    const encodedMsg = encodeURIComponent(message);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;

    window.open(url, "_blank");
    setOpen(false);
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
        className="!bg-[#25D366] hover:!bg-[#1FB855]"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">שלח בוואטסאפ</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
                  טלפון הלקוח
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="050-1234567"
                  className="w-full h-11 px-3 rounded-lg border border-neutral-300 focus:border-[var(--color-brand-yellow)] focus:outline-none text-right"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  השאר ריק אם רוצה לבחור איש קשר בוואטסאפ עצמו
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
                  הודעה
                </label>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 rounded-lg border border-neutral-300 focus:border-[var(--color-brand-yellow)] focus:outline-none text-sm"
                />
              </div>

              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-neutral-700">
                💡 <strong>טיפ:</strong> ההודעה תכלול קישור לצפייה ב-PDF.
                הלקוח יוכל ללחוץ ישירות מהוואטסאפ.
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  ביטול
                </Button>
                <Button onClick={shareToWhatsApp}>
                  <MessageCircle className="h-4 w-4" />
                  פתח בוואטסאפ
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function buildDefaultMessage(p: WhatsAppShareButtonProps): string {
  const greeting = p.clientName ? `שלום ${p.clientName},` : "שלום,";
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const pdfLink = `${baseUrl}/api/quotes/${p.quoteId}/pdf`;
  const logoLink = `${baseUrl}/logo-full.svg`;

  return `${greeting}

מצורפת הצעת מחיר מס' ${p.quoteNumber}
סה"כ: ${formatCurrency(p.total)}

לצפייה ב-PDF:
${pdfLink}

לוגו מנלו:
${logoLink}

לכל שאלה אני זמין.
בברכה,
${p.orgName || "מנלו בנייה"}`;
}
