import { cn } from "@/lib/utils";

interface MenloAppIconProps {
  className?: string;
  title?: string;
}

export function MenloAppIcon({
  className,
  title = "מנלו בנייה",
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
      <svg
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="512" height="512" rx="96" fill="#f5c842" />
        <circle cx="256" cy="256" r="214" fill="#fff" />

        <g transform="translate(310 176) scale(.86)">
          <path
            d="M6 4c42 0 90 81 100 188-29 13-69 13-100 1V4Z"
            fill="#227db9"
          />
          <path
            d="M118 5c34 0 77 70 89 185-31 14-70 14-104 2 7-83 28-147 15-187Z"
            fill="#f5c842"
          />
          <path
            d="M94 112c25 30 40 72 36 112-19 15-53 15-73 0 0-43 13-82 37-112Z"
            fill="#00a99d"
            opacity=".92"
          />
        </g>

        <text
          x="201"
          y="287"
          textAnchor="middle"
          direction="rtl"
          unicodeBidi="bidi-override"
          fontFamily="Arial, Heebo, sans-serif"
          fontWeight="900"
          fontSize="112"
          fill="#414042"
        >
          מנלו
        </text>
        <text
          x="148"
          y="340"
          textAnchor="middle"
          direction="rtl"
          unicodeBidi="bidi-override"
          fontFamily="Arial, Heebo, sans-serif"
          fontWeight="700"
          fontSize="48"
          fill="#414042"
        >
          בניה
        </text>
      </svg>
    </span>
  );
}
