import { auth } from "@/auth";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { deleteMyAddressById, updateMyAddress } from "@/modules/account/account.service";
import { customerAddressIdParamsSchema, updateCustomerAddressSchema } from "@/modules/account/account.validators";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    }
    const routeParams = parseOrThrow(customerAddressIdParamsSchema, await params);
    const body = await request.json();
    const input = parseOrThrow(updateCustomerAddressSchema, body);
    const data = await updateMyAddress(session.user, routeParams.id, input);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    }
    const routeParams = parseOrThrow(customerAddressIdParamsSchema, await params);
    const data = await deleteMyAddressById(session.user, routeParams.id);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
