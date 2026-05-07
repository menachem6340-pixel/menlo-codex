import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl bg-white border-2 border-dashed border-neutral-300 p-12 text-center">
      <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-yellow)]/20">
        <Icon className="h-8 w-8 text-[var(--color-brand-blue)]" />
      </div>
      <h3 className="text-xl font-semibold text-[var(--color-brand-dark)] mb-2">{title}</h3>
      {description && <p className="text-neutral-600 mb-6 max-w-md mx-auto">{description}</p>}
      {action}
    </div>
  );
}
