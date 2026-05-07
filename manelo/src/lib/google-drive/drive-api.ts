import type { GoogleDriveToken } from "./server";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export interface ProjectDriveFolders {
  root: DriveFile;
  projectsRoot: DriveFile;
  project: DriveFile;
  plans: DriveFile;
  boqs: DriveFile;
  quotes: DriveFile;
  documents: DriveFile;
  photos: DriveFile;
}

export async function ensureProjectDriveFolders(
  token: GoogleDriveToken,
  rootFolderName: string,
  projectName: string
): Promise<ProjectDriveFolders> {
  const root = await ensureFolder(token, rootFolderName);
  const projectsRoot = await ensureFolder(token, "01 פרויקטים", root.id);
  const project = await ensureFolder(token, cleanDriveName(projectName), projectsRoot.id);

  const [plans, boqs, quotes, documents, photos] = await Promise.all([
    ensureFolder(token, "01 תכניות", project.id),
    ensureFolder(token, "02 כתבי כמויות", project.id),
    ensureFolder(token, "03 הצעות מחיר", project.id),
    ensureFolder(token, "04 מסמכים", project.id),
    ensureFolder(token, "05 תמונות מהשטח", project.id),
  ]);

  return { root, projectsRoot, project, plans, boqs, quotes, documents, photos };
}

export async function uploadFileIfMissing(
  token: GoogleDriveToken,
  params: {
    parentId: string;
    name: string;
    mimeType: string;
    data: Buffer;
  }
): Promise<{ file: DriveFile; created: boolean }> {
  const name = cleanDriveName(params.name);
  const existing = await findFile(token, name, params.parentId);
  if (existing) return { file: existing, created: false };

  const file = await uploadFile(token, {
    ...params,
    name,
  });
  return { file, created: true };
}

export function cleanDriveName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || "ללא שם";
}

async function ensureFolder(token: GoogleDriveToken, name: string, parentId?: string): Promise<DriveFile> {
  const cleanName = cleanDriveName(name);
  const existing = await findFolder(token, cleanName, parentId);
  if (existing) return existing;

  return driveRequest<DriveFile>(token, "/drive/v3/files?fields=id,name,mimeType,webViewLink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: cleanName,
      mimeType: FOLDER_MIME_TYPE,
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
}

async function findFolder(token: GoogleDriveToken, name: string, parentId?: string): Promise<DriveFile | null> {
  return findFileByQuery(
    token,
    [
      `mimeType='${FOLDER_MIME_TYPE}'`,
      `name='${escapeDriveQuery(name)}'`,
      "trashed=false",
      parentId ? `'${escapeDriveQuery(parentId)}' in parents` : undefined,
    ]
      .filter(Boolean)
      .join(" and ")
  );
}

async function findFile(token: GoogleDriveToken, name: string, parentId: string): Promise<DriveFile | null> {
  return findFileByQuery(
    token,
    [
      `name='${escapeDriveQuery(name)}'`,
      "trashed=false",
      `'${escapeDriveQuery(parentId)}' in parents`,
    ].join(" and ")
  );
}

async function findFileByQuery(token: GoogleDriveToken, q: string): Promise<DriveFile | null> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", q);
  url.searchParams.set("spaces", "drive");
  url.searchParams.set("pageSize", "1");
  url.searchParams.set("fields", "files(id,name,mimeType,webViewLink,webContentLink)");

  const response = await driveRequest<{ files: DriveFile[] }>(token, url.toString().replace(/^https:\/\/www.googleapis.com/, ""));
  return response.files?.[0] || null;
}

async function uploadFile(
  token: GoogleDriveToken,
  params: {
    parentId: string;
    name: string;
    mimeType: string;
    data: Buffer;
  }
): Promise<DriveFile> {
  const boundary = `menlo_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: params.name,
    parents: [params.parentId],
  });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`, "utf8"),
    Buffer.from(`--${boundary}\r\nContent-Type: ${params.mimeType}\r\n\r\n`, "utf8"),
    params.data,
    Buffer.from(`\r\n--${boundary}--`, "utf8"),
  ]);

  return driveRequest<DriveFile>(
    token,
    "/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.byteLength),
      },
      body: body as unknown as BodyInit,
    }
  );
}

async function driveRequest<T>(token: GoogleDriveToken, path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("https://") ? path : `https://www.googleapis.com${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Google Drive error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
