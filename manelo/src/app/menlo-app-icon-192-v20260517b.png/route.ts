import { APP_ICON_PNG_192 } from "@/lib/app-icon-png";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  return new Response(Buffer.from(APP_ICON_PNG_192, "base64"), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
}
