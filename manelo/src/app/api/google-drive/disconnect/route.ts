import { NextResponse } from "next/server";
import { clearGoogleDriveTokenCookie } from "@/lib/google-drive/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearGoogleDriveTokenCookie(response);
  return response;
}

export const runtime = "nodejs";
