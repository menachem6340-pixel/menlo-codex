"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Link2Off } from "lucide-react";

export function DriveConnectionPanel({ connected }: { connected: boolean }) {
  const router = useRouter();

  async function disconnect() {
    await fetch("/api/google-drive/disconnect", { method: "POST" });
    router.refresh();
  }

  if (connected) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-700" />
          <div>
            <div className="font-semibold text-green-900">Google Drive מחובר</div>
            <div className="text-green-800">אפשר לסנכרן פרויקטים, תכניות, כתבי כמויות והצעות מחיר.</div>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={disconnect}>
          <Link2Off className="h-4 w-4" />
          נתק חיבור
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="text-sm">
        <div className="font-semibold text-neutral-900">Google Drive עדיין לא מחובר</div>
        <div className="text-neutral-700">לחץ חיבור, אשר את Google, ואז תחזור למסך הזה לסנכרון פרויקטים.</div>
      </div>
      <Link href="/api/google-drive/auth?returnTo=/dashboard/drive">
        <Button type="button">חבר Google Drive</Button>
      </Link>
    </div>
  );
}
