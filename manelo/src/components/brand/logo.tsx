import {
  APP_BRAND_NAME,
  APP_LOGO_FULL,
} from "@/lib/brand";
import { MenloAppIcon } from "@/components/brand/menlo-app-icon";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "circle" | "icon";
  size?: number;
  className?: string;
}

/**
 * לוגו גרסת Codex
 *
 * variant="full"   - הלוגו המקורי הרחב של מנלו בניה
 * variant="circle" - אייקון האפליקציה המקורי על רקע צהוב
 * variant="icon"   - אייקון האפליקציה המקורי על רקע צהוב
 */
export function Logo({ variant = "full", size = 64, className }: LogoProps) {
  const aspectRatio = variant === "full" ? 2.53 : 1;
  const width = variant === "full" ? size * aspectRatio : size;
  const height = size;

  if (variant !== "full") {
    return (
      <div
        className={cn("inline-flex items-center", className)}
        style={{ width: size, height: size }}
      >
        <MenloAppIcon className="h-full w-full" title={APP_BRAND_NAME} />
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center", className)}
      style={{ width, height }}
    >
      <img
        src={APP_LOGO_FULL}
        alt={APP_BRAND_NAME}
        width={width}
        height={height}
        className="h-full w-full object-contain"
        draggable={false}
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
