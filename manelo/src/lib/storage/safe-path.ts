const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/webm": "webm",
};

export function fileExtensionFromNameOrType(name?: string, mimeType?: string): string {
  const fromType = mimeType ? MIME_EXTENSIONS[mimeType] : undefined;
  if (fromType) return fromType;

  const fromName = name?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 10) return fromName;
  return "bin";
}

export function uniqueStorageFileName(originalName?: string, mimeType?: string): string {
  const ext = fileExtensionFromNameOrType(originalName, mimeType);
  const now = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `${now}-${random}.${ext}`;
}

export function formatStorageError(message: string): string {
  if (/invalid key/i.test(message)) {
    return "שם הקובץ לא היה תקין לאחסון. תיקנתי את זה לשמות פנימיים בטוחים; נסה להעלות שוב.";
  }

  if (/bucket|not found/i.test(message)) {
    return "לא נמצא אזור אחסון לקבצים. בדוק שב-Supabase קיים bucket בשם PLANS.";
  }

  return message;
}
