import { NextResponse } from "next/server";
import {
  clearGoogleDriveStateCookie,
  exchangeCodeForToken,
  readGoogleDriveStateCookie,
  readGoogleDriveToken,
  setGoogleDriveTokenCookie,
} from "@/lib/google-drive/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const savedState = await readGoogleDriveStateCookie();
  const returnTo = savedState?.returnTo || "/dashboard/drive";

  if (error) {
    return redirectWithStatus(returnTo, "error", error);
  }

  if (!code || !state || !savedState || savedState.state !== state) {
    return redirectWithStatus(returnTo, "error", "state");
  }

  try {
    const existing = await readGoogleDriveToken();
    const token = await exchangeCodeForToken(code);
    const response = redirectWithStatus(returnTo, "connected", "1");
    setGoogleDriveTokenCookie(response, {
      ...token,
      refresh_token: token.refresh_token || existing?.refresh_token,
    });
    clearGoogleDriveStateCookie(response);
    return response;
  } catch (e) {
    return redirectWithStatus(returnTo, "error", e instanceof Error ? e.message : "unknown");
  }
}

function redirectWithStatus(returnTo: string, key: "connected" | "error", value: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.GOOGLE_REDIRECT_URI?.replace("/api/google-drive/callback", "") ||
    "http://localhost:3001";
  const redirectUrl = new URL(returnTo, baseUrl);
  redirectUrl.searchParams.set("drive", key);
  redirectUrl.searchParams.set("details", value);
  return NextResponse.redirect(redirectUrl);
}

export const runtime = "nodejs";
