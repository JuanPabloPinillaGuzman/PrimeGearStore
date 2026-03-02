import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 to-primary/5">
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" className="text-primary">
          <path
            d="M4 6h16M6 10h12M8 14h8M10 18h4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
