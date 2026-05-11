"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { MobileMenu } from "@/components/dashboard/mobile-menu";
import { APP_BRAND_NAME, APP_LOGO_ICON } from "@/lib/brand";

interface TopBarProps {
  profile: {
    full_name?: string | null;
    organization?: { name?: string | null } | null;
  } | null;
  userEmail: string;
}

export function TopBar({ profile, userEmail }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-neutral-200 flex items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMenuOpen(true)}
            className="lg:hidden"
            aria-label="פתח תפריט"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <img
            src={APP_LOGO_ICON}
            alt={APP_BRAND_NAME}
            className="h-8 w-8 shrink-0 rounded-lg object-contain lg:hidden"
          />
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">
              שלום, {profile?.full_name || userEmail}
            </div>
            <div className="hidden sm:block text-xs text-neutral-500 truncate">
              {profile?.organization?.name || "מנלו בנייה"}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">יציאה</span>
        </Button>
      </header>
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        profile={profile}
        userEmail={userEmail}
      />
    </>
  );
}
