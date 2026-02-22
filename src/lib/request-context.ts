export function getRequestId(request?: Request) {
  if (!request) {
    return crypto.randomUUID();
  }

  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}
