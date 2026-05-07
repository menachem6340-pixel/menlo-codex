import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "מנלו בנייה - ניהול קבלנים",
  description: "מערכת ניהול מקצועית לקבלני בניין - ניתוח תכניות, כתבי כמויות, הצעות מחיר, ניהול פרויקטים וצוות",
  manifest: "/manifest.json",
  applicationName: "מנלו בנייה",
  appleWebApp: {
    capable: true,
    title: "מנלו",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/logo-icon.svg",
    apple: "/logo-icon.svg",
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
      <body className="min-h-full flex flex-col font-sans bg-neutral-50 text-neutral-900">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
