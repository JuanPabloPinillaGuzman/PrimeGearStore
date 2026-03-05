"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-lg font-bold">No pudimos cargar esta sección</p>
        <p className="text-sm text-muted-foreground">Ocurrió un error inesperado en tu cuenta.</p>
      </div>
      <Button variant="outline" className="rounded-full" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
