"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mobileBottomNavItems } from "@/lib/dashboard/nav";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0px)]">
      <div className="grid grid-cols-5">
        {mobileBottomNavItems.map((item) => {
          const active =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                active ? "text-[var(--color-brand-blue)]" : "text-neutral-500"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  active && "rounded-full bg-[var(--color-brand-yellow)]/25 p-0.5"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
