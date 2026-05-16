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
    <aside className="hidden lg:flex w-64 flex-col bg-white border-l border-neutral-200">
      {/* Logo */}
      <div className="h-20 flex items-center gap-3 px-4 border-b border-neutral-200">
        <Logo variant="full" size={38} className="w-[98px] shrink-0" />
        <div className="flex-1 min-w-0 border-r border-neutral-200 pr-3">
          <div className="text-xs text-neutral-500 truncate">
            {profile?.full_name}
          </div>
          <div className="text-xs font-medium text-neutral-700 truncate">
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
                  ? "bg-[var(--color-brand-yellow)]/20 text-[var(--color-brand-dark)]"
                  : "text-neutral-600 hover:bg-neutral-100"
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
