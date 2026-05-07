"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyzePlanButtonProps {
  planId: string;
  hasAnalysis: boolean;
}

export function AnalyzePlanButton({ planId, hasAnalysis }: AnalyzePlanButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function analyzePlan() {
    setLoading(true);
    try {
      const response = await fetch("/api/plans/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "הניתוח נכשל");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "הניתוח נכשל");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" onClick={analyzePlan} disabled={loading}>
      <Sparkles className="h-4 w-4" />
      {loading ? "מנתח..." : hasAnalysis ? "נתח מחדש" : "נתח תכנית"}
    </Button>
  );
}
