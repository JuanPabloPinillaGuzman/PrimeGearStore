"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminError({
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
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-lg font-bold">Error en el panel</p>
        <p className="text-sm text-muted-foreground">
          {error.message || "Ocurrió un error inesperado."}
        </p>
      </div>
      <Button variant="outline" className="gap-2 rounded-xl" onClick={reset}>
        <RefreshCw className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}
