import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const GOOGLE_DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const TOKEN_COOKIE = "menlo_google_drive";
const STATE_COOKIE = "menlo_google_drive_state";

export interface GoogleDriveToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type?: string;
  scope?: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  rootFolderName: string;
}

export function getGoogleDriveConfig(): GoogleDriveConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/google-drive/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Google Drive לא מוגדר. חסרים GOOGLE_CLIENT_ID או GOOGLE_CLIENT_SECRET.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    rootFolderName: process.env.GOOGLE_DRIVE_ROOT_FOLDER || "מנלו בנייה",
  };
}

export function buildGoogleDriveAuthUrl(state: string) {
  const config = getGoogleDriveConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_DRIVE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url;
}

export async function exchangeCodeForToken(code: string): Promise<GoogleDriveToken> {
  const config = getGoogleDriveConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "התחברות Google Drive נכשלה");
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type,
    scope: payload.scope,
    expires_at: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
}

export async function refreshGoogleDriveToken(token: GoogleDriveToken): Promise<GoogleDriveToken> {
  if (!token.refresh_token) {
    throw new Error("אין Refresh Token ל-Google Drive. צריך להתחבר מחדש.");
  }

  const config = getGoogleDriveConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "רענון Google Drive נכשל");
  }

  return {
    ...token,
    access_token: payload.access_token,
    token_type: payload.token_type || token.token_type,
    scope: payload.scope || token.scope,
    expires_at: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
}

export async function readGoogleDriveToken(): Promise<GoogleDriveToken | null> {
  const cookieStore = await cookies();
  return decodeToken(cookieStore.get(TOKEN_COOKIE)?.value);
}

export async function getValidGoogleDriveToken(): Promise<{
  token: GoogleDriveToken | null;
  refreshedToken: GoogleDriveToken | null;
}> {
  const token = await readGoogleDriveToken();
  if (!token) return { token: null, refreshedToken: null };

  if (token.expires_at > Date.now() + 60_000) {
    return { token, refreshedToken: null };
  }

  const refreshedToken = await refreshGoogleDriveToken(token);
  return { token: refreshedToken, refreshedToken };
}

export function setGoogleDriveTokenCookie(response: NextResponse, token: GoogleDriveToken) {
  response.cookies.set(TOKEN_COOKIE, encodeToken(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export function clearGoogleDriveTokenCookie(response: NextResponse) {
  response.cookies.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function setGoogleDriveStateCookie(response: NextResponse, state: string, returnTo: string) {
  response.cookies.set(STATE_COOKIE, encodeState({ state, returnTo }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function readGoogleDriveStateCookie(): Promise<{ state: string; returnTo: string } | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(STATE_COOKIE)?.value;
  if (!value) return null;

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function clearGoogleDriveStateCookie(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function encodeToken(token: GoogleDriveToken) {
  return Buffer.from(JSON.stringify(token), "utf8").toString("base64url");
}

function decodeToken(value?: string): GoogleDriveToken | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function encodeState(value: { state: string; returnTo: string }) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}
