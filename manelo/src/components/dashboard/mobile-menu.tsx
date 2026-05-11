"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboardNavItems } from "@/lib/dashboard/nav";
import { APP_BRAND_NAME, APP_LOGO_ICON } from "@/lib/brand";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  profile: {
    full_name?: string | null;
    organization?: { name?: string | null } | null;
  } | null;
  userEmail: string;
}

export function MobileMenu({ open, onClose, profile, userEmail }: MobileMenuProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <button
        type="button"
        aria-label="סגור תפריט"
        className="absolute inset-0 bg-neutral-950/45"
        onClick={onClose}
      />

      <aside className="absolute inset-y-0 right-0 flex w-[min(92vw,380px)] flex-col bg-white shadow-2xl">
        <div className="border-b border-neutral-200 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <img
              src={APP_LOGO_ICON}
              alt={APP_BRAND_NAME}
              className="h-14 w-14 rounded-lg object-contain"
            />
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="סגור תפריט">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-sm font-semibold text-[var(--color-brand-dark)]">
              {profile?.full_name || userEmail}
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">
              {profile?.organization?.name || "מנלו בנייה"}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-1 gap-2">
            {dashboardNavItems.map((item) => {
              const active =
                item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-all",
                    active
                      ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/20 text-[var(--color-brand-dark)]"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-[var(--color-brand-yellow)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-white text-[var(--color-brand-blue)]" : "bg-neutral-100 text-neutral-600"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-neutral-500">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-neutral-200 p-3 text-center text-xs text-neutral-500">
          כל מסכי הניהול זמינים גם מהטלפון
        </div>
      </aside>
    </div>
  );
}
