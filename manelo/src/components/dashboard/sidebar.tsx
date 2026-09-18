"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { dashboardNavItems } from "@/lib/dashboard/nav";

interface SidebarProps {
  profile: {
    full_name: string;
    organization?: { name: string } | null;
  } | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-[var(--color-brand-dark)] text-white border-l border-white/10 shadow-xl shadow-neutral-900/10">
      {/* Logo */}
      <div className="h-20 flex items-center gap-3 px-4 border-b border-white/10">
        <Logo variant="full" size={38} className="w-[98px] shrink-0" />
        <div className="flex-1 min-w-0 border-r border-white/15 pr-3">
          <div className="text-xs text-neutral-400 truncate">
            {profile?.full_name}
          </div>
          <div className="text-xs font-medium text-white truncate">
            {profile?.organization?.name}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {dashboardNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--color-brand-yellow)] text-[var(--color-brand-dark)] shadow-sm"
                  : "text-neutral-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
