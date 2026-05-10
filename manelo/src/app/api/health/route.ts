import { NextResponse } from "next/server";
import {
  APP_BRAND_NAME,
  APP_DEFAULT_ORG_NAME,
  APP_DRIVE_ROOT_FOLDER,
  APP_PRODUCTION_URL,
  APP_PWA_CACHE_VERSION,
} from "@/lib/brand";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: APP_BRAND_NAME,
    organizationFallback: APP_DEFAULT_ORG_NAME,
    driveRootFolder: process.env.GOOGLE_DRIVE_ROOT_FOLDER || APP_DRIVE_ROOT_FOLDER,
    productionUrl: process.env.NEXT_PUBLIC_BASE_URL || APP_PRODUCTION_URL,
    pwaCacheVersion: APP_PWA_CACHE_VERSION,
    checks: {
      supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      anthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
      googleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
      googleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      googleRedirectUri: Boolean(process.env.GOOGLE_REDIRECT_URI),
    },
  });
}

export const runtime = "nodejs";
