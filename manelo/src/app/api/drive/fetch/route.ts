import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * מוריד קובץ מ-Google Drive (קישור ציבורי)
 * Drive מחזיר HTML של אישור עבור קבצים גדולים, אז אנחנו צריכים לטפל בזה.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = (await req.json()) as { url: string };
    if (!url || !url.includes("drive.google.com")) {
      return NextResponse.json({ error: "URL לא תקין" }, { status: 400 });
    }

    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileId = idMatch?.[1];

    // נסה כמה גישות במקביל
    const attempts = [
      url,
      fileId ? `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t` : null,
      fileId ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t` : null,
    ].filter((u): u is string => u !== null);

    let lastError = "";

    for (const attemptUrl of attempts) {
      try {
        const res = await fetch(attemptUrl, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        const contentType = res.headers.get("content-type") || "";

        // אם זה HTML - זו דף האישור של Google
        if (contentType.includes("text/html")) {
          const html = await res.text();

          // חפש form עם action להורדה
          const formActionMatch = html.match(/action="([^"]+)"/);
          const confirmMatch = html.match(/name="confirm"\s+value="([^"]+)"/);
          const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/);

          if (formActionMatch && fileId) {
            const params = new URLSearchParams({
              id: fileId,
              export: "download",
              confirm: confirmMatch?.[1] || "t",
              ...(uuidMatch ? { uuid: uuidMatch[1] } : {}),
            });

            const downloadUrl = `${formActionMatch[1].replace(/&amp;/g, "&")}?${params.toString()}`;
            const finalRes = await fetch(downloadUrl, { redirect: "follow" });

            if (finalRes.ok && !(finalRes.headers.get("content-type") || "").includes("text/html")) {
              const buf = await finalRes.arrayBuffer();
              return new Response(buf, {
                headers: {
                  "Content-Type": finalRes.headers.get("content-type") || "application/octet-stream",
                  "Content-Disposition": finalRes.headers.get("content-disposition") || "",
                },
              });
            }
          }

          lastError = "Drive החזיר דף HTML - הקובץ ככל הנראה דורש הרשאות נוספות או שלא הוגדר גישה ציבורית";
          continue;
        }

        if (!res.ok) {
          lastError = `Drive החזיר ${res.status}`;
          continue;
        }

        // הצלחה - החזר את הקובץ
        const buf = await res.arrayBuffer();
        return new Response(buf, {
          headers: {
            "Content-Type": contentType || "application/octet-stream",
            "Content-Disposition": res.headers.get("content-disposition") || "",
          },
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Unknown";
        continue;
      }
    }

    return NextResponse.json(
      {
        error: `הורדה מ-Drive נכשלה: ${lastError}\n\nוודא:\n1. הקישור הוא לקובץ (לא לתיקייה)\n2. הקובץ מוגדר "Anyone with the link" - לא רק התיקייה\n3. בקובץ עצמו: שתף → שנה ל"כל מי שיש לו את הקישור"`,
      },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
