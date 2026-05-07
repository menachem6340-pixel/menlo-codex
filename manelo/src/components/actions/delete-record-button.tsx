"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type DeleteType = "quote" | "boq" | "plan" | "plan_analysis";

const CONFIG: Record<
  DeleteType,
  { singular: string; confirmText: string }
> = {
  quote: {
    singular: "הצעת המחיר",
    confirmText: "למחוק את הצעת המחיר? פעולה זו תמחק גם את שורות ההצעה.",
  },
  boq: {
    singular: "כתב הכמויות",
    confirmText:
      "למחוק את כתב הכמויות? פעולה זו תמחק גם את הסעיפים והשורות שלו. הצעות מחיר קיימות לא יימחקו.",
  },
  plan: {
    singular: "התכנית",
    confirmText: "למחוק את התכנית? פעולה זו תמחק גם את ניתוחי ה-AI שלה.",
  },
  plan_analysis: {
    singular: "ניתוח התכנית",
    confirmText: "למחוק את ניתוח התכנית? קובץ התכנית יישאר, ורק תוצאת הניתוח תימחק.",
  },
};

interface DeleteRecordButtonProps {
  id: string;
  type: DeleteType;
  redirectTo?: string;
  label?: string;
  compact?: boolean;
}

export function DeleteRecordButton({
  id,
  type,
  redirectTo,
  label = "מחק",
  compact = false,
}: DeleteRecordButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const config = CONFIG[type];

  async function deleteRecord(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!confirm(config.confirmText)) return;

    setDeleting(true);
    const supabase = createClient();
    const { error } = await deleteByType(supabase, type, id);

    if (error) {
      alert(`לא הצלחתי למחוק את ${config.singular}: ${error.message}`);
      setDeleting(false);
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="danger"
      size={compact ? "icon" : "sm"}
      onClick={deleteRecord}
      disabled={deleting}
      title={config.confirmText}
    >
      <Trash2 className="h-4 w-4" />
      {!compact && (deleting ? "מוחק..." : label)}
    </Button>
  );
}

function deleteByType(
  supabase: ReturnType<typeof createClient>,
  type: DeleteType,
  id: string
) {
  if (type === "quote") return supabase.from("quotes").delete().eq("id", id);
  if (type === "boq") return supabase.from("boqs").delete().eq("id", id);
  if (type === "plan") return supabase.from("plans").delete().eq("id", id);
  return supabase.from("plan_analyses").delete().eq("id", id);
}
