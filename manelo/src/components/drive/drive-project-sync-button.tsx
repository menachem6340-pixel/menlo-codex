"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen, RefreshCw } from "lucide-react";

interface SyncResult {
  ok: boolean;
  projectFolder?: {
    webViewLink?: string;
  };
  createdCount?: number;
  existingCount?: number;
  failedCount?: number;
  error?: string;
}

export function DriveProjectSyncButton({
  projectId,
  connected,
}: {
  projectId: string;
  connected: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function syncProject() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/google-drive/sync-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const payload = (await response.json()) as SyncResult;
      setResult(payload);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "הסנכרון נכשל" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" size="sm" onClick={syncProject} disabled={!connected || loading}>
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "מסנכרן..." : "סנכרן ל-Drive"}
      </Button>

      {result?.ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-900">
          נשמר: {result.createdCount || 0}, כבר היה קיים: {result.existingCount || 0}
          {result.failedCount ? `, שגיאות: ${result.failedCount}` : ""}
          {result.projectFolder?.webViewLink && (
            <a
              href={result.projectFolder.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 font-semibold underline"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              פתח תיקיית פרויקט
            </a>
          )}
        </div>
      )}

      {result && !result.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {result.error || "הסנכרון נכשל"}
        </div>
      )}
    </div>
  );
}
