import { AppError } from "@/lib/errors/app-error";

type PreferenceItem = {
  title: string;
  quantity: number;
  unitPrice: number;
};

function envOrThrow(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new AppError("INTERNAL_ERROR", 500, `${name} is not configured.`);
  }
  return value;
}

function parseHttpsPublicBaseUrl(): string {
  const baseUrl = process.env.PUBLIC_BASE_URL;
  const vercelEnv = (process.env.VERCEL_ENV ?? "").toLowerCase();
  const isPreview = vercelEnv === "preview";
  const isProduction = vercelEnv === "production" || process.env.NODE_ENV === "production";

  if (!baseUrl) {
    if (isPreview) {
      throw new AppError(
        "BAD_REQUEST",
        400,
        "Mercado Pago init is disabled in preview until PUBLIC_BASE_URL is configured with https.",
      );
    }
    if (isProduction) {
      throw new AppError(
        "INTERNAL_ERROR",
        500,
        "PUBLIC_BASE_URL must be configured with a valid https URL in production.",
      );
    }
    throw new AppError("INTERNAL_ERROR", 500, "PUBLIC_BASE_URL is not configured.");
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    if (isPreview) {
      throw new AppError(
        "BAD_REQUEST",
        400,
        "Mercado Pago init is disabled in preview until PUBLIC_BASE_URL is a valid https URL.",
      );
    }
    throw new AppError(
      isProduction ? "INTERNAL_ERROR" : "BAD_REQUEST",
      isProduction ? 500 : 400,
      "PUBLIC_BASE_URL must be a valid URL.",
    );
  }

  if (parsed.protocol !== "https:") {
    if (isPreview) {
      throw new AppError(
        "BAD_REQUEST",
        400,
        "Mercado Pago init is disabled in preview until PUBLIC_BASE_URL uses https.",
      );
    }
    if (isProduction) {
      throw new AppError(
        "INTERNAL_ERROR",
        500,
        "PUBLIC_BASE_URL must use https in production.",
      );
    }
  }

  return baseUrl.replace(/\/$/, "");
}

async function mpFetch<T>(path: string): Promise<T> {
  const token = envOrThrow("MERCADOPAGO_ACCESS_TOKEN");
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AppError("BAD_REQUEST", 400, "Could not verify Mercado Pago resource.");
  }

  return (await response.json()) as T;
}

export async function createMercadoPagoPreference(input: {
  orderNumber: string;
  items: PreferenceItem[];
}) {
  const token = envOrThrow("MERCADOPAGO_ACCESS_TOKEN");
  const baseUrl = parseHttpsPublicBaseUrl();

  const body = {
    external_reference: input.orderNumber,
    items: input.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: "COP",
    })),
    back_urls: {
      success: `${baseUrl}/payments/success?orderNumber=${encodeURIComponent(input.orderNumber)}`,
      failure: `${baseUrl}/payments/failure?orderNumber=${encodeURIComponent(input.orderNumber)}`,
      pending: `${baseUrl}/payments/pending?orderNumber=${encodeURIComponent(input.orderNumber)}`,
    },
    auto_return: "approved",
    notification_url: `${baseUrl}/api/store/payments/mercadopago/webhook`,
  };

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AppError("BAD_REQUEST", 400, "Could not create Mercado Pago preference.");
  }

  return (await response.json()) as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
}

export async function getMercadoPagoPayment(paymentId: string) {
  return mpFetch<{
    id: string | number;
    status: string;
    transaction_amount: number;
    external_reference?: string;
  }>(`/v1/payments/${encodeURIComponent(paymentId)}`);
}

export async function getMercadoPagoMerchantOrder(merchantOrderId: string) {
  return mpFetch<{
    id: string | number;
    external_reference?: string;
    paid_amount?: number;
    order_status?: string;
    payments?: Array<{
      id: string | number;
      status: string;
      transaction_amount?: number;
    }>;
  }>(`/merchant_orders/${encodeURIComponent(merchantOrderId)}`);
}

export async function searchMercadoPagoPaymentByExternalReference(orderNumber: string) {
  return mpFetch<{
    results?: Array<{
      id: string | number;
      status: string;
      transaction_amount: number;
      external_reference?: string;
    }>;
  }>(
    `/v1/payments/search?external_reference=${encodeURIComponent(orderNumber)}&sort=date_created&criteria=desc&limit=1`,
  );
}
