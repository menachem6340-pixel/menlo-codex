import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-5 sm:mb-6 flex items-start justify-between gap-3 sm:gap-4 flex-wrap", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-brand-dark)] leading-tight break-words">
          {title}
        </h1>
        {description && <p className="text-sm sm:text-base text-neutral-600 mt-1">{description}</p>}
      </div>
      {action && <div className="w-full sm:w-auto sm:shrink-0">{action}</div>}
    </div>
  );
}
