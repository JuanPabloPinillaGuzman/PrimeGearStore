export type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
};

export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

function normalizeErrorMessage(status: number, code?: string, message?: string) {
  const upper = `${code ?? ""} ${message ?? ""}`.toUpperCase();

  if (status === 409 && (upper.includes("OUT_OF_STOCK") || upper.includes("STOCK"))) {
    return "No hay stock suficiente para esta variante.";
  }
  if (status === 400 && (upper.includes("INVALID_COUPON") || upper.includes("CUPON") || upper.includes("COUPON"))) {
    return "Cupon invalido o expirado.";
  }
  if ((status === 409 || status === 410) && (upper.includes("RESERVATION") || upper.includes("RESERVA"))) {
    return "Tu reserva expiro, vuelve a intentar.";
  }

  return message || "No fue posible completar la solicitud.";
}

async function parseBody<T>(response: Response): Promise<T | ApiErrorPayload | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await response.json()) as T | ApiErrorPayload;
  } catch {
    return null;
  }
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await parseBody<T>(response);

  if (!response.ok) {
    const payload = body as ApiErrorPayload | null;
    const code = payload?.error?.code;
    const requestId = payload?.error?.requestId ?? response.headers.get("x-request-id") ?? undefined;
    const message = normalizeErrorMessage(response.status, code, payload?.error?.message);
    throw new HttpClientError(message, response.status, code, requestId);
  }

  return body as T;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

