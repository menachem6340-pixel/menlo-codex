import {
  APP_BRAND_NAME,
  APP_LOGO_CIRCLE,
  APP_LOGO_FULL,
  APP_LOGO_ICON,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "circle" | "icon";
  size?: number;
  className?: string;
}

export function Logo({ variant = "full", size = 64, className }: LogoProps) {
  const src =
    variant === "circle"
      ? APP_LOGO_CIRCLE
      : variant === "icon"
        ? APP_LOGO_ICON
        : APP_LOGO_FULL;

  const aspectRatio = variant === "full" ? 2.68 : 1;
  const width = variant === "full" ? size * aspectRatio : size;
  const height = size;

  return (
    <div className={cn("inline-flex items-center", className)}>
      <img
        src={src}
        alt={APP_BRAND_NAME}
        width={width}
        height={height}
        className="object-contain"
      />
    </div>
  );
}

export function LogoText({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="text-3xl font-extrabold text-[var(--color-brand-dark)]">
        קודקס
      </span>
      <span className="text-lg font-medium text-neutral-500">מנלו</span>
    </div>
  );
}
