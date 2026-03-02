"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BundleBox } from "@/components/store/BundleBox";
import { CartItemRow } from "@/components/store/CartItemRow";
import { CheckoutLayout } from "@/components/store/CheckoutLayout";
import { CouponBox } from "@/components/store/CouponBox";
import { EmptyState } from "@/components/store/EmptyState";
import { OrderSummary } from "@/components/store/OrderSummary";
import { useCart } from "@/components/store/useCart";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage, requestJson } from "@/lib/http/client";

type CartPayload = {
  data: {
    cartId: string;
    status: string;
    appliedBundle: { bundleId: string; name: string } | null;
    items: Array<{
      id: string;
      productId: number;
      productName: string;
      variantId: string | null;
      variantName: string | null;
      quantity: string;
      unitPriceSnapshot: string;
      lineTotal: string;
      currency: string;
    }>;
    totals: {
      subtotal: string;
      currency: string;
      itemsCount: number;
    };
  };
};

type CouponValidatePayload = {
  data: { valid: boolean; discountAmount: string; newTotal: string; reason?: string };
};

type CheckoutPayload = {
  data: {
    orderNumber: string;
  };
};

type MpInitPayload = {
  data: {
    initPoint: string;
  };
};

type MeAddressesPayload = {
  data: {
    items: Array<{
      id: string;
      type: string;
      fullName: string;
      phone: string;
      country: string;
      department: string;
      city: string;
      addressLine1: string;
      addressLine2: string | null;
      postalCode: string | null;
      isDefault: boolean;
    }>;
  };
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cartId: localCartId, setCartId } = useCart();

  const [cartId, setCartIdState] = useState<string | null>(null);
  const [branchId, setBranchId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState("0");
  const [bundleDiscount, setBundleDiscount] = useState("0");
  const [cart, setCart] = useState<CartPayload["data"] | null>(null);
  const [loadingCart, setLoadingCart] = useState(false);
  const [mutatingCartItemId, setMutatingCartItemId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<MeAddressesPayload["data"]["items"]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<string>("");

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("cartId");
    const next = fromQuery || localCartId || null;
    if (next) {
      setCartIdState(next);
      setCartId(next);
    }
  }, [localCartId, setCartId]);

  async function loadCart(targetCartId: string) {
    setLoadingCart(true);
    setError(null);
    try {
      const payload = await requestJson<CartPayload>(`/api/store/cart?cartId=${encodeURIComponent(targetCartId)}`, {
        cache: "no-store",
      });
      setCart(payload.data);
      if (!payload.data.appliedBundle) setBundleDiscount("0");
    } catch (e) {
      setError(getErrorMessage(e, "No fue posible cargar carrito."));
      setCart(null);
    } finally {
      setLoadingCart(false);
    }
  }

  useEffect(() => {
    if (cartId) void loadCart(cartId);
  }, [cartId]);

  useEffect(() => {
    let cancelled = false;
    async function loadAddresses() {
      setAddressesLoading(true);
      try {
        const payload = await requestJson<MeAddressesPayload>("/api/store/me/addresses", {
          cache: "no-store",
        }).catch(() => null);
        if (!payload) {
          if (!cancelled) setSavedAddresses([]);
          return;
        }
        const shipping = payload.data.items.filter((item) => item.type === "SHIPPING");
        if (!cancelled) {
          setSavedAddresses(shipping);
          const defaultAddress = shipping.find((item) => item.isDefault) ?? shipping[0];
          if (defaultAddress) setSelectedShippingAddressId(defaultAddress.id);
        }
      } finally {
        if (!cancelled) setAddressesLoading(false);
      }
    }
    void loadAddresses();
    return () => {
      cancelled = true;
    };
  }, []);

  const validateCouponForSummary = useCallback(async (code: string) => {
    if (!cartId || !code.trim()) {
      setCouponDiscount("0");
      return;
    }
    try {
      const payload = await requestJson<CouponValidatePayload>("/api/store/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, code: code.trim() }),
      });
      if (!payload.data.valid) {
        setCouponDiscount("0");
        return;
      }
      setCouponDiscount(payload.data.discountAmount);
    } catch {
      setCouponDiscount("0");
    }
  }, [cartId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void validateCouponForSummary(couponCode);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [cartId, couponCode, validateCouponForSummary]);

  async function patchItemQuantity(itemId: string, quantity: number) {
    if (!cartId) return;
    setMutatingCartItemId(itemId);
    try {
      const payload = await requestJson<CartPayload>("/api/store/cart/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemId, quantity }),
      });
      setCart(payload.data);
    } catch (e) {
      setError(getErrorMessage(e, "No fue posible actualizar carrito."));
    } finally {
      setMutatingCartItemId(null);
    }
  }

  async function removeItem(itemId: string) {
    if (!cartId) return;
    setMutatingCartItemId(itemId);
    try {
      const payload = await requestJson<CartPayload>("/api/store/cart/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemId }),
      });
      setCart(payload.data);
    } catch (e) {
      setError(getErrorMessage(e, "No fue posible remover item."));
    } finally {
      setMutatingCartItemId(null);
    }
  }

  const summary = useMemo(() => {
    const subtotal = Number(cart?.totals.subtotal ?? 0);
    const discount = Number(couponDiscount || 0) + Number(bundleDiscount || 0);
    const total = Math.max(0, subtotal - discount);
    return {
      subtotal: String(subtotal),
      discount: String(discount),
      total: String(total),
      currency: cart?.totals.currency ?? "COP",
    };
  }, [bundleDiscount, cart?.totals.currency, cart?.totals.subtotal, couponDiscount]);

  async function continueToPayment() {
    if (!cartId) {
      setError("Carrito no disponible.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const checkoutPayload = await requestJson<CheckoutPayload>("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId,
          branchId: branchId ? Number(branchId) : undefined,
          couponCode: couponCode.trim() || undefined,
        }),
      });

      const mpPayload = await requestJson<MpInitPayload>("/api/store/payments/mercadopago/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: checkoutPayload.data.orderNumber }),
      });

      window.location.href = mpPayload.data.initPoint;
    } catch (e) {
      setError(getErrorMessage(e, "No fue posible continuar al pago."));
    } finally {
      setSubmitting(false);
    }
  }

  const left = (
    <>
      <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Checkout</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Finaliza tu compra</h1>
          </div>
          {cartId ? (
            <p className="text-xs text-muted-foreground">
              Cart ID: <span className="font-mono">{cartId}</span>
            </p>
          ) : null}
        </div>
        {error ? (
          <div
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
            data-testid="checkout-error-banner"
          >
            {error}
          </div>
        ) : null}
      </section>

      <details className="rounded-2xl border border-border/80 bg-card/70 p-3 shadow-sm lg:hidden">
        <summary className="cursor-pointer list-none text-sm font-medium">Resumen del pedido</summary>
        <div className="mt-3">
          <OrderSummary
            subtotal={summary.subtotal}
            discount={summary.discount}
            total={summary.total}
            currency={summary.currency}
            loading={submitting}
            error={null}
            onCheckout={() => void continueToPayment()}
          />
        </div>
      </details>

      <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Items del carrito</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="branchId" className="text-xs text-muted-foreground">
              Branch
            </label>
            <input
              id="branchId"
              type="number"
              min={1}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm"
            />
          </div>
        </div>
        {loadingCart ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : null}
        {!loadingCart && !cartId ? (
          <EmptyState
            title="No hay carrito activo"
            description="Agrega productos desde el catalogo o mini-cart."
            actionLabel="Ir al catalogo"
            onAction={() => router.push("/store")}
          />
        ) : null}
        {!loadingCart && cart && cart.items.length === 0 ? (
          <EmptyState title="Carrito vacio" description="Agrega productos para continuar." />
        ) : null}
        <div className="space-y-3">
          {cart?.items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              loading={mutatingCartItemId === item.id}
              onIncrement={() => void patchItemQuantity(item.id, Number(item.quantity) + 1)}
              onDecrement={() => void patchItemQuantity(item.id, Math.max(1, Number(item.quantity) - 1))}
              onRemove={() => void removeItem(item.id)}
            />
          ))}
        </div>
      </section>

      <CouponBox cartId={cartId} couponCode={couponCode} onChangeCouponCode={setCouponCode} />

      <BundleBox
        cartId={cartId}
        appliedBundle={cart?.appliedBundle ?? null}
        onEstimatedBundleDiscountChange={setBundleDiscount}
        onBundleApplied={() => {
          if (cartId) void loadCart(cartId);
        }}
      />

      <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
        <div className="mb-3">
          <h2 className="text-base font-semibold tracking-tight">Direccion de envio</h2>
          <p className="text-sm text-muted-foreground">
            Si estas autenticado, puedes seleccionar una direccion guardada. (No se envia aun al backend en este paso.)
          </p>
        </div>
        {addressesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : savedAddresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay direcciones guardadas o no has iniciado sesion. Puedes gestionarlas en{" "}
            <a className="text-primary hover:underline" href="/account/addresses">
              /account/addresses
            </a>
            .
          </p>
        ) : (
          <div className="space-y-2">
            {savedAddresses.map((address) => (
              <label
                key={address.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-3"
              >
                <input
                  type="radio"
                  name="shippingAddress"
                  className="mt-1"
                  value={address.id}
                  checked={selectedShippingAddressId === address.id}
                  onChange={(e) => setSelectedShippingAddressId(e.target.value)}
                />
                <div className="text-sm">
                  <p className="font-medium">
                    {address.fullName}{" "}
                    {address.isDefault ? <span className="text-xs text-primary">(Predeterminada)</span> : null}
                  </p>
                  <p className="text-muted-foreground">
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ""} - {address.city}, {address.department}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {address.country} · {address.phone}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const right = (
    <OrderSummary
      subtotal={summary.subtotal}
      discount={summary.discount}
      total={summary.total}
      currency={summary.currency}
      loading={submitting}
      error={null}
      onCheckout={() => void continueToPayment()}
    />
  );

  return <CheckoutLayout left={left} right={<div className="hidden lg:block">{right}</div>} />;
}
