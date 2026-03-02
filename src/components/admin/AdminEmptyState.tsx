import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40">
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" className="text-muted-foreground">
              <path
                d="M5 7h14v10H5zM8 10h8M8 13h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
        {actionLabel && onAction && (
          <Button variant="outline" onClick={onAction} type="button">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
