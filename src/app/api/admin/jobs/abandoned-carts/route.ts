import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { abandonedCartsRecoveryJob } from "@/modules/webstore/jobs.service";
import { abandonedCartsJobQuerySchema } from "@/modules/webstore/validators";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(abandonedCartsJobQuerySchema, query);
    const data = await abandonedCartsRecoveryJob(input);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
