import { NextResponse } from "next/server";
import { buildGoogleDriveAuthUrl, setGoogleDriveStateCookie } from "@/lib/google-drive/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/dashboard/drive";
  const state = crypto.randomUUID();
  const googleUrl = buildGoogleDriveAuthUrl(state);
  const response = NextResponse.redirect(googleUrl);

  setGoogleDriveStateCookie(response, state, returnTo.startsWith("/") ? returnTo : "/dashboard/drive");
  return response;
}

export const runtime = "nodejs";
