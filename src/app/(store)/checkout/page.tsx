"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BundleBox } from "@/components/store/BundleBox";
import { CartItemRow } from "@/components/store/CartItemRow";
import { CheckoutLayout } from "@/components/store/CheckoutLayout";
import { CouponBox } from "@/components/store/CouponBox";
import { OrderSummary } from "@/components/store/OrderSummary";
import { useCart } from "@/components/store/useCart";
import { EmptyState } from "@/components/store/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

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
      const response = await fetch(`/api/store/cart?cartId=${encodeURIComponent(targetCartId)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as CartPayload | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar carrito.");
      }
      setCart(payload.data);
      if (!payload.data.appliedBundle) setBundleDiscount("0");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible cargar carrito.");
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
        const response = await fetch("/api/store/me/addresses", { cache: "no-store" });
        const payload = (await response.json()) as MeAddressesPayload | { error?: { message?: string } };
        if (!response.ok || !("data" in payload)) {
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

  async function validateCouponForSummary(code: string) {
    if (!cartId || !code.trim()) {
      setCouponDiscount("0");
      return;
    }
    try {
      const response = await fetch("/api/store/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, code: code.trim() }),
      });
      const payload = (await response.json()) as CouponValidatePayload | { error?: { message?: string } };
      if (!response.ok || !("data" in payload) || !payload.data.valid) {
        setCouponDiscount("0");
        return;
      }
      setCouponDiscount(payload.data.discountAmount);
    } catch {
      setCouponDiscount("0");
    }
  }

  async function patchItemQuantity(itemId: string, quantity: number) {
    if (!cartId) return;
    setMutatingCartItemId(itemId);
    try {
      const response = await fetch("/api/store/cart/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemId, quantity }),
      });
      const payload = (await response.json()) as CartPayload | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible actualizar carrito.");
      }
      setCart(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible actualizar carrito.");
    } finally {
      setMutatingCartItemId(null);
    }
  }

  async function removeItem(itemId: string) {
    if (!cartId) return;
    setMutatingCartItemId(itemId);
    try {
      const response = await fetch("/api/store/cart/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemId }),
      });
      const payload = (await response.json()) as CartPayload | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible remover item.");
      }
      setCart(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible remover item.");
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
      const checkoutRes = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId,
          branchId: branchId ? Number(branchId) : undefined,
          couponCode: couponCode.trim() || undefined,
        }),
      });
      const checkoutPayload = (await checkoutRes.json()) as CheckoutPayload | { error?: { message?: string } };
      if (!checkoutRes.ok || !("data" in checkoutPayload)) {
        throw new Error(("error" in checkoutPayload && checkoutPayload.error?.message) || "No fue posible crear la orden.");
      }

      const mpRes = await fetch("/api/store/payments/mercadopago/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: checkoutPayload.data.orderNumber }),
      });
      const mpPayload = (await mpRes.json()) as MpInitPayload | { error?: { message?: string } };
      if (!mpRes.ok || !("data" in mpPayload)) {
        throw new Error(("error" in mpPayload && mpPayload.error?.message) || "No fue posible iniciar pago.");
      }

      window.location.href = mpPayload.data.initPoint;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible continuar al pago.");
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
            <p className="text-xs text-muted-foreground">Cart ID: <span className="font-mono">{cartId}</span></p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Items del carrito</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="branchId" className="text-xs text-muted-foreground">Branch</label>
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
            description="Agrega productos desde el catálogo o mini-cart."
            actionLabel="Ir al catálogo"
            onAction={() => router.push("/store")}
          />
        ) : null}
        {!loadingCart && cart && cart.items.length === 0 ? (
          <EmptyState title="Carrito vacío" description="Agrega productos para continuar." />
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

      <CouponBox
        cartId={cartId}
        couponCode={couponCode}
        onChangeCouponCode={(next) => {
          setCouponCode(next);
          void validateCouponForSummary(next);
        }}
      />

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
          <h2 className="text-base font-semibold tracking-tight">Dirección de envío</h2>
          <p className="text-sm text-muted-foreground">
            Si estás autenticado, puedes seleccionar una dirección guardada. (No se envía aún al backend en este paso.)
          </p>
        </div>
        {addressesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : savedAddresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay direcciones guardadas o no has iniciado sesión. Puedes gestionarlas en{" "}
            <a className="text-primary hover:underline" href="/account/addresses">
              /account/addresses
            </a>.
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
                    {address.fullName} {address.isDefault ? <span className="text-xs text-primary">(Predeterminada)</span> : null}
                  </p>
                  <p className="text-muted-foreground">
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ""} - {address.city}, {address.department}
                  </p>
                  <p className="text-xs text-muted-foreground">{address.country} · {address.phone}</p>
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
      error={error}
      onCheckout={() => void continueToPayment()}
    />
  );

  return <CheckoutLayout left={left} right={right} />;
}
