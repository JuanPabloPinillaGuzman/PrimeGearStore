import { handleRouteError, jsonOk } from "@/lib/errors/http";
import {
  importVariantsCsvText,
  readCsvImportRequestBody,
} from "@/modules/backoffice/imports/imports.service";

export async function POST(request: Request) {
  try {
    const text = await readCsvImportRequestBody(request);
    const data = await importVariantsCsvText(text);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

