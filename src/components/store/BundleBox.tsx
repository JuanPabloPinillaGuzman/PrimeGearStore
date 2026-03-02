"use client";

import { useEffect, useState } from "react";

import { Price } from "@/components/store/Price";
import { Button } from "@/components/ui/button";
import { getErrorMessage, requestJson } from "@/lib/http/client";

type BundleRow = {
  bundleId: string;
  name: string;
  discountType: string;
  discountValue: string;
  estimatedDiscount: string;
};

type ApplicableResponse = { data: { bundles: BundleRow[] } };

export function BundleBox({
  cartId,
  appliedBundle,
  onBundleApplied,
  onEstimatedBundleDiscountChange,
}: {
  cartId: string | null;
  appliedBundle: { bundleId: string; name: string } | null;
  onBundleApplied: () => void;
  onEstimatedBundleDiscountChange?: (discount: string) => void;
}) {
  const [bundles, setBundles] = useState<BundleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!cartId) {
      setBundles([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setMessage(null);
        try {
          const payload = await requestJson<ApplicableResponse>(
            `/api/store/bundles/applicable?cartId=${encodeURIComponent(cartId)}`,
            { cache: "no-store" },
          );
          if (cancelled) return;
          setBundles(payload.data.bundles);
          if (appliedBundle) {
            const selected = payload.data.bundles.find((b) => b.bundleId === appliedBundle.bundleId);
            onEstimatedBundleDiscountChange?.(selected?.estimatedDiscount ?? "0");
          } else {
            onEstimatedBundleDiscountChange?.("0");
          }
        } catch (error) {
          if (!cancelled) setMessage(getErrorMessage(error, "No fue posible cargar bundles."));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [appliedBundle, cartId, onEstimatedBundleDiscountChange]);

  async function applyBundle(bundleId: string) {
    if (!cartId) return;
    setApplyingId(bundleId);
    setMessage(null);
    try {
      await requestJson<{ data?: unknown }>("/api/store/bundles/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, bundleId }),
      });
      setMessage("Bundle aplicado.");
      const selected = bundles.find((b) => b.bundleId === bundleId);
      onEstimatedBundleDiscountChange?.(selected?.estimatedDiscount ?? "0");
      onBundleApplied();
    } catch (error) {
      setMessage(getErrorMessage(error, "No fue posible aplicar bundle."));
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Bundles / Combos</p>
        {appliedBundle ? <span className="text-xs text-muted-foreground">Aplicado: {appliedBundle.name}</span> : null}
      </div>
      <div className="mt-3 space-y-2">
        {loading ? <p className="text-xs text-muted-foreground">Cargando bundles...</p> : null}
        {!loading && bundles.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay bundles aplicables.</p>
        ) : null}
        {bundles.map((bundle) => (
          <div key={bundle.bundleId} className="rounded-xl border border-border/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{bundle.name}</p>
                <p className="text-xs text-muted-foreground">
                  Descuento estimado: <Price amount={bundle.estimatedDiscount} currency="COP" />
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void applyBundle(bundle.bundleId)}
                disabled={applyingId === bundle.bundleId || appliedBundle?.bundleId === bundle.bundleId}
              >
                {appliedBundle?.bundleId === bundle.bundleId
                  ? "Aplicado"
                  : applyingId === bundle.bundleId
                    ? "..."
                    : "Aplicar"}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
