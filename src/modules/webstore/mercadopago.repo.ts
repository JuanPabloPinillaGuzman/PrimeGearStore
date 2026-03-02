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
  const baseUrl = envOrThrow("PUBLIC_BASE_URL");

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
