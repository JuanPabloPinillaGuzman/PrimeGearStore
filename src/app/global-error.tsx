"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { captureClientError } from "@/lib/observability/sentry-client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void captureClientError(error, { source: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-dvh max-w-xl items-center px-6">
          <div className="w-full rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Error</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Ocurrio un problema inesperado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ya registramos el error si Sentry esta habilitado.
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={reset}>Reintentar</Button>
              <Button variant="outline" asChild>
                <a href="/store">Volver al store</a>
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
