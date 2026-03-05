import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Illustration */}
      <div className="relative mb-8">
        {/* Glow rings */}
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative flex size-24 items-center justify-center rounded-full border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className="text-primary/50"
          >
            <rect x="4" y="8" width="32" height="4" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="8" y="18" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
            <rect x="12" y="27" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
          </svg>
        </div>
      </div>

      <p className="font-display text-xl font-bold tracking-tight">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>

      {actionLabel && onAction ? (
        <Button
          className="mt-7 rounded-full shadow-sm shadow-primary/10"
          variant="outline"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
