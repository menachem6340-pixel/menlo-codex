import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa/pwa-register";
import {
  APP_BRAND_NAME,
  APP_BRAND_SHORT_NAME,
  APP_BRAND_TAGLINE,
  APP_ASSET_VERSION,
  APP_ICON_512_VERSIONED,
  APP_ICON_MASKABLE_VERSIONED,
} from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_BRAND_NAME} - ניהול קבלנים`,
  description: "מערכת ניהול מקצועית לקבלני בניין - ניתוח תכניות, כתבי כמויות, הצעות מחיר, ניהול פרויקטים וצוות",
  manifest: `/manifest.json?v=${APP_ASSET_VERSION}`,
  applicationName: APP_BRAND_NAME,
  appleWebApp: {
    capable: true,
    title: APP_BRAND_SHORT_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: `/favicon.ico?v=${APP_ASSET_VERSION}`, type: "image/png" },
      { url: `/icon.png?v=${APP_ASSET_VERSION}`, sizes: "512x512", type: "image/png" },
      { url: APP_ICON_512_VERSIONED, sizes: "1024x1024", type: "image/png" },
    ],
    shortcut: [{ url: `/favicon.ico?v=${APP_ASSET_VERSION}`, type: "image/png" }],
    apple: [
      { url: `/apple-icon.png?v=${APP_ASSET_VERSION}`, sizes: "512x512", type: "image/png" },
      { url: APP_ICON_MASKABLE_VERSIONED, sizes: "1024x1024", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F5C842",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col font-sans bg-neutral-50 text-neutral-900"
        data-app-brand={APP_BRAND_NAME}
        data-app-tagline={APP_BRAND_TAGLINE}
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
