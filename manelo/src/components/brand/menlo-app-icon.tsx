import { cn } from "@/lib/utils";
import { APP_BRAND_NAME, APP_LOGO_ICON } from "@/lib/brand";

interface MenloAppIconProps {
  className?: string;
  title?: string;
}

export function MenloAppIcon({
  className,
  title = APP_BRAND_NAME,
}: MenloAppIconProps) {
  return (
    <span
      role="img"
      aria-label={title}
      className={cn(
        "inline-flex aspect-square shrink-0 overflow-hidden rounded-[22%] bg-[#f5c842] shadow-sm ring-1 ring-black/5",
        className
      )}
    >
      <img
        src={APP_LOGO_ICON}
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}
