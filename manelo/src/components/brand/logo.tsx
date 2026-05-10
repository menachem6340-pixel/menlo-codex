import Image from "next/image";
import { APP_BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "circle" | "icon";
  size?: number;
  className?: string;
}

/**
 * לוגו גרסת Codex
 *
 * variant="full"   - לוגו אופקי על רקע שקוף (לכותרת)
 * variant="circle" - לוגו עגול על רקע צהוב (למסך התחברות)
 * variant="icon"   - אייקון מרובע של לוגו החברה
 */
export function Logo({ variant = "full", size = 64, className }: LogoProps) {
  const src =
    variant === "circle"
      ? "/logo-circle.svg"
      : variant === "icon"
        ? "/logo-icon.svg"
        : "/logo-full.svg";

  const aspectRatio = variant === "full" ? 2.5 : 1;
  const width = variant === "full" ? size * aspectRatio : size;
  const height = size;

  return (
    <div className={cn("inline-flex items-center", className)}>
      <Image
        src={src}
        alt={APP_BRAND_NAME}
        width={width}
        height={height}
        priority
        className="object-contain"
      />
    </div>
  );
}

/**
 * fallback טקסטואלי לפני שהלוגו הוטען
 */
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
