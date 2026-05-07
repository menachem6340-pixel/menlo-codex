import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { DriveConnectionPanel } from "@/components/drive/drive-connection-panel";
import { DriveProjectSyncButton } from "@/components/drive/drive-project-sync-button";
import { readGoogleDriveToken } from "@/lib/google-drive/server";
import { Briefcase, ExternalLink, FileText, FolderOpen, Upload } from "lucide-react";

interface ProjectRow {
  id: string;
  name: string;
  address: string | null;
  client?: { name: string } | { name: string }[] | null;
}

interface ProjectLinkedRow {
  project_id: string | null;
}

const ROOT_FOLDER = "מנלו בנייה";

export default async function DrivePage() {
  const supabase = await createClient();
  const driveToken = await readGoogleDriveToken();
  const driveConnected = Boolean(driveToken?.access_token || driveToken?.refresh_token);
  const [projectsResult, plansResult, boqsResult, quotesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, address, client:contacts(name)")
      .order("created_at", { ascending: false }),
    supabase.from("plans").select("project_id"),
    supabase.from("boqs").select("project_id"),
    supabase.from("quotes").select("project_id"),
  ]);

  const projects = (projectsResult.data || []) as ProjectRow[];
  const planCounts = countByProject((plansResult.data || []) as ProjectLinkedRow[]);
  const boqCounts = countByProject((boqsResult.data || []) as ProjectLinkedRow[]);
  const quoteCounts = countByProject((quotesResult.data || []) as ProjectLinkedRow[]);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Drive"
        description="סידור תכניות, כתבי כמויות והצעות מחיר לפי פרויקט"
        action={
          <a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4" />
              פתח Google Drive
            </Button>
          </a>
        }
      />

      <div className="mb-5">
        <DriveConnectionPanel connected={driveConnected} />
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[var(--color-brand-blue)]" />
            מבנה תיקיות מנלו
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {["01 פרויקטים", "02 הצעות מחיר", "03 תכניות", "04 כתבי כמויות", "05 מסמכים כלליים"].map(
              (folder) => (
                <div key={folder} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
                  <div className="text-xs text-neutral-500">{ROOT_FOLDER}</div>
                  <div className="font-semibold">{folder}</div>
                </div>
              )
            )}
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            אחרי חיבור Google Drive, כפתור הסנכרון ייצור את התיקיות ויעלה אליהן תכניות, כתבי כמויות והצעות מחיר.
          </p>
        </CardContent>
      </Card>

      {!projects.length ? (
        <EmptyState
          icon={Briefcase}
          title="אין פרויקטים לסידור ב-Drive"
          description="צור פרויקט ראשון, ואז יופיע כאן מבנה התיקיות שלו."
          action={
            <Link href="/dashboard/projects/new">
              <Button>פרויקט חדש</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((project) => {
            const client = firstRelation(project.client);
            const folders = [
              { label: "01 תכניות", count: planCounts.get(project.id) || 0 },
              { label: "02 כתבי כמויות", count: boqCounts.get(project.id) || 0 },
              { label: "03 הצעות מחיר", count: quoteCounts.get(project.id) || 0 },
              { label: "04 מסמכים", count: null },
              { label: "05 תמונות מהשטח", count: null },
            ];

            return (
              <Card key={project.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[var(--color-brand-dark)] truncate">{project.name}</h3>
                    <p className="text-sm text-neutral-500 truncate">
                      {client?.name || "ללא לקוח"}{project.address ? ` · ${project.address}` : ""}
                    </p>
                  </div>
                  <FolderOpen className="h-5 w-5 text-[var(--color-brand-blue)] shrink-0" />
                </div>

                <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-sm mb-4">
                  <span className="text-neutral-500">{ROOT_FOLDER} / 01 פרויקטים / </span>
                  <span className="font-medium">{project.name}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {folders.map((folder) => (
                    <div key={folder.label} className="rounded-lg border border-neutral-200 p-3 text-sm">
                      <div className="font-medium">{folder.label}</div>
                      <div className="text-xs text-neutral-500">
                        {folder.count === null ? "מוכן לקבצים" : `${folder.count} קבצים במנלו`}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <DriveProjectSyncButton projectId={project.id} connected={driveConnected} />
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <Button variant="outline" size="sm">
                      <Briefcase className="h-4 w-4" />
                      פרויקט
                    </Button>
                  </Link>
                  <Link href={`/dashboard/projects/${project.id}/plans/upload`}>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4" />
                      תכנית
                    </Button>
                  </Link>
                  <Link href={`/dashboard/quotes/new?projectId=${project.id}`}>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4" />
                      הצעה
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function countByProject(rows: ProjectLinkedRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.project_id) return;
    counts.set(row.project_id, (counts.get(row.project_id) || 0) + 1);
  });
  return counts;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
