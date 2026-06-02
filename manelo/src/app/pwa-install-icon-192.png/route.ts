import { PWA_INSTALL_ICON_PNG_192 } from "@/lib/pwa-install-icon-192";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  return new Response(Buffer.from(PWA_INSTALL_ICON_PNG_192, "base64"), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
}
