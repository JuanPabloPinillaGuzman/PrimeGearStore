import { handleRouteError, jsonOk } from "@/lib/errors/http";
import {
  importProductsCsvText,
  readCsvImportRequestBody,
} from "@/modules/backoffice/imports/service";

export async function POST(request: Request) {
  try {
    const text = await readCsvImportRequestBody(request);
    const data = await importProductsCsvText(text);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

