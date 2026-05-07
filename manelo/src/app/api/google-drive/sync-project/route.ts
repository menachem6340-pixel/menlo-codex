import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBoqExcel } from "@/lib/boq/excel-export";
import { cleanDriveName, ensureProjectDriveFolders, uploadFileIfMissing } from "@/lib/google-drive/drive-api";
import {
  getGoogleDriveConfig,
  getValidGoogleDriveToken,
  setGoogleDriveTokenCookie,
} from "@/lib/google-drive/server";
import { mergeWithLetterhead } from "@/lib/pdf/merge-letterhead";
import { renderQuotePdf } from "@/lib/pdf/quote-pdf";

interface SyncRequest {
  projectId?: string;
  includePlans?: boolean;
  includeBoqs?: boolean;
  includeQuotes?: boolean;
}

interface SyncFileResult {
  type: "plan" | "boq" | "quote";
  name: string;
  url?: string;
  created?: boolean;
  error?: string;
}

export async function POST(request: Request) {
  const { token, refreshedToken } = await getValidGoogleDriveToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Google Drive לא מחובר" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as SyncRequest;
  if (!body.projectId) {
    return NextResponse.json({ ok: false, error: "חסר פרויקט לסנכרון" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "צריך להתחבר למנלו" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("organization_id").single();
  if (!profile?.organization_id) {
    return NextResponse.json({ ok: false, error: "לא נמצא ארגון" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, address, organization_id, client:contacts(name, phone)")
    .eq("id", body.projectId)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!project) {
    return NextResponse.json({ ok: false, error: "הפרויקט לא נמצא" }, { status: 404 });
  }

  const config = getGoogleDriveConfig();
  const folders = await ensureProjectDriveFolders(token, config.rootFolderName, project.name);
  const results: SyncFileResult[] = [];

  if (body.includePlans !== false) {
    const { data: plans } = await supabase
      .from("plans")
      .select("id, name, file_url, file_type")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    for (const plan of plans || []) {
      try {
        const file = await fetchRemoteFile(plan.file_url);
        const upload = await uploadFileIfMissing(token, {
          parentId: folders.plans.id,
          name: ensureExtension(plan.name, plan.file_type || file.extension || "pdf"),
          mimeType: file.mimeType || mimeFromExtension(plan.file_type || "pdf"),
          data: file.data,
        });
        results.push({
          type: "plan",
          name: upload.file.name,
          url: upload.file.webViewLink,
          created: upload.created,
        });
      } catch (e) {
        results.push({ type: "plan", name: plan.name, error: messageFromError(e) });
      }
    }
  }

  if (body.includeBoqs !== false) {
    const { data: boqs } = await supabase
      .from("boqs")
      .select("*, project:projects(name, address, client:contacts(name, phone)), organization:organizations(name, business_id, phone, email, address)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    for (const boq of boqs || []) {
      try {
        const [{ data: sections }, { data: items }] = await Promise.all([
          supabase.from("boq_sections").select("*").eq("boq_id", boq.id).order("display_order"),
          supabase.from("boq_items").select("*").eq("boq_id", boq.id).order("display_order"),
        ]);
        const boqProject = firstRelation<{
          name: string;
          address?: string;
          client?: { name: string; phone?: string } | { name: string; phone?: string }[] | null;
        }>(boq.project);
        const client = firstRelation<{ name: string; phone?: string }>(boqProject?.client);
        const buffer = await buildBoqExcel({
          boq: { name: boq.name, created_at: boq.created_at },
          project: boqProject ? { name: boqProject.name, address: boqProject.address } : null,
          client,
          organization: boq.organization || { name: "מנלו בנייה" },
          sections: sections || [],
          items: items || [],
        });
        const upload = await uploadFileIfMissing(token, {
          parentId: folders.boqs.id,
          name: `${cleanDriveName(boq.name)}.xlsx`,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          data: buffer,
        });
        results.push({
          type: "boq",
          name: upload.file.name,
          url: upload.file.webViewLink,
          created: upload.created,
        });
      } catch (e) {
        results.push({ type: "boq", name: boq.name, error: messageFromError(e) });
      }
    }
  }

  if (body.includeQuotes !== false) {
    const { data: quotes } = await supabase
      .from("quotes")
      .select("*, client:contacts(name, phone, email, address, city, business_id), project:projects(name, address), organization:organizations(name, business_id, address, phone, email)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    for (const quote of quotes || []) {
      try {
        const { data: items } = await supabase
          .from("quote_items")
          .select("*")
          .eq("quote_id", quote.id)
          .order("display_order");
        const quotePdf = await renderQuotePdf({ quote, items: items || [] });
        const finalPdf = await mergeWithLetterhead(quotePdf);
        const upload = await uploadFileIfMissing(token, {
          parentId: folders.quotes.id,
          name: `${cleanDriveName(`הצעת מחיר ${quote.quote_number} - ${quote.title}`)}.pdf`,
          mimeType: "application/pdf",
          data: finalPdf,
        });
        results.push({
          type: "quote",
          name: upload.file.name,
          url: upload.file.webViewLink,
          created: upload.created,
        });
      } catch (e) {
        results.push({ type: "quote", name: quote.title, error: messageFromError(e) });
      }
    }
  }

  const payload = {
    ok: true,
    rootFolder: folders.root,
    projectFolder: folders.project,
    folders,
    results,
    createdCount: results.filter((item) => item.created).length,
    existingCount: results.filter((item) => item.created === false).length,
    failedCount: results.filter((item) => item.error).length,
  };
  const response = NextResponse.json(payload);
  if (refreshedToken) setGoogleDriveTokenCookie(response, refreshedToken);
  return response;
}

async function fetchRemoteFile(url: string): Promise<{ data: Buffer; mimeType: string; extension?: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`לא ניתן להוריד קובץ תכנית (${response.status})`);
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const data = Buffer.from(await response.arrayBuffer());
  return { data, mimeType: contentType, extension: extensionFromMime(contentType) };
}

function ensureExtension(name: string, extension: string) {
  const cleanName = cleanDriveName(name);
  const cleanExtension = extension.replace(/^\./, "").toLowerCase();
  if (!cleanExtension) return cleanName;
  return cleanName.toLowerCase().endsWith(`.${cleanExtension}`) ? cleanName : `${cleanName}.${cleanExtension}`;
}

function mimeFromExtension(extension: string) {
  const ext = extension.replace(/^\./, "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "dwg") return "application/acad";
  if (ext === "dxf") return "image/vnd.dxf";
  return "application/octet-stream";
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  return undefined;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "שגיאה לא ידועה";
}

export const runtime = "nodejs";
