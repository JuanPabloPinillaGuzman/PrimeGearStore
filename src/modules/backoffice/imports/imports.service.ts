import { Prisma } from "@prisma/client";

import { parseOrThrow } from "@/lib/validators/parse";
import type {
  CsvImportResultDto,
  ImportProductCsvRow,
  ImportVariantCsvRow,
} from "@/modules/backoffice/imports/imports.dto";
import {
  findCategoryForImport,
  findProductForImportByIdOrSku,
  findProductForVariantImport,
  findVariantForImportByIdOrSku,
  prisma,
  upsertProductImport,
  upsertVariantImport,
} from "@/modules/backoffice/imports/imports.repo";
import { importProductsCsvRowSchema, importVariantsCsvRowSchema } from "@/modules/backoffice/imports/imports.validators";

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => r.some((value) => value.trim() !== ""));
  if (nonEmptyRows.length === 0) {
    return { headers: [], rows: [] };
  }
  const [headers, ...dataRows] = nonEmptyRows;
  return { headers: headers.map((h) => h.trim()), rows: dataRows };
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  throw new Error(`Invalid boolean value "${value}"`);
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid number "${value}"`);
  return n;
}

function parseOptionalBigint(value: string | undefined): bigint | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  try {
    return BigInt(value);
  } catch {
    throw new Error(`Invalid bigint "${value}"`);
  }
}

function mapRow(headers: string[], values: string[]) {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    row[header] = values[index] ?? "";
  });
  return row;
}

function ensureRequiredHeaders(actual: string[], required: string[]) {
  const missing = required.filter((header) => !actual.includes(header));
  if (missing.length > 0) {
    throw new Error(`Missing required headers: ${missing.join(", ")}`);
  }
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

export async function importProductsCsvText(text: string): Promise<CsvImportResultDto> {
  const parsed = parseCsv(text);
  ensureRequiredHeaders(parsed.headers, ["productId", "sku", "name", "categoryId", "isActive", "slug"]);

  const result: CsvImportResultDto = { created: 0, updated: 0, failed: 0, errors: [] };
  const indexedRows = parsed.rows.map((values, index) => ({ rowNumber: index + 2, values }));

  for (const group of chunk(indexedRows, 100)) {
    for (const item of group) {
      try {
        const raw = mapRow(parsed.headers, item.values);
        const rowInput: ImportProductCsvRow = parseOrThrow(importProductsCsvRowSchema, {
          productId: parseOptionalNumber(raw.productId),
          sku: raw.sku?.trim() || undefined,
          name: raw.name,
          categoryId:
            raw.categoryId?.trim() === ""
              ? null
              : raw.categoryId === undefined
                ? undefined
                : parseOptionalNumber(raw.categoryId),
          isActive: parseBoolean(raw.isActive),
          slug: raw.slug?.trim() || undefined,
        });

        await prisma.$transaction(async (tx) => {
          if (rowInput.categoryId) {
            const category = await findCategoryForImport(tx, rowInput.categoryId);
            if (!category) throw new Error(`Category ${rowInput.categoryId} not found`);
          }

          const existing = await findProductForImportByIdOrSku(tx, {
            productId: rowInput.productId,
            sku: rowInput.sku,
          });

          await upsertProductImport(tx, {
            existingId: existing?.id,
            sku: rowInput.sku,
            name: rowInput.name,
            categoryId: rowInput.categoryId,
            isActive: rowInput.isActive,
            slug: rowInput.slug,
          });

          if (existing) result.updated += 1;
          else result.created += 1;
        });
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          row: item.rowNumber,
          message: error instanceof Error ? error.message : "Invalid row",
        });
      }
    }
  }

  return result;
}

export async function importVariantsCsvText(text: string): Promise<CsvImportResultDto> {
  const parsed = parseCsv(text);
  ensureRequiredHeaders(parsed.headers, [
    "variantId",
    "productId",
    "sku",
    "name",
    "attributes_json",
    "isActive",
  ]);

  const result: CsvImportResultDto = { created: 0, updated: 0, failed: 0, errors: [] };
  const indexedRows = parsed.rows.map((values, index) => ({ rowNumber: index + 2, values }));

  for (const group of chunk(indexedRows, 100)) {
    for (const item of group) {
      try {
        const raw = mapRow(parsed.headers, item.values);
        let attributes: Record<string, unknown> = {};
        if (raw.attributes_json?.trim()) {
          const parsedJson = JSON.parse(raw.attributes_json);
          if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
            throw new Error("attributes_json must be a JSON object");
          }
          attributes = parsedJson as Record<string, unknown>;
        }

        const rowInput: ImportVariantCsvRow = parseOrThrow(importVariantsCsvRowSchema, {
          variantId: parseOptionalBigint(raw.variantId),
          productId: parseOptionalNumber(raw.productId),
          sku: raw.sku?.trim() || undefined,
          name: raw.name,
          attributes,
          isActive: parseBoolean(raw.isActive),
        });

        await prisma.$transaction(async (tx) => {
          const product = await findProductForVariantImport(tx, rowInput.productId);
          if (!product) throw new Error(`Product ${rowInput.productId} not found`);

          const existing = await findVariantForImportByIdOrSku(tx, {
            variantId: rowInput.variantId,
            sku: rowInput.sku,
          });

          await upsertVariantImport(tx, {
            existingId: existing?.id,
            productId: rowInput.productId,
            sku: rowInput.sku,
            name: rowInput.name,
            attributes: rowInput.attributes as Prisma.InputJsonValue,
            isActive: rowInput.isActive,
          });

          if (existing) result.updated += 1;
          else result.created += 1;
        });
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          row: item.rowNumber,
          message: error instanceof Error ? error.message : "Invalid row",
        });
      }
    }
  }

  return result;
}

export async function readCsvImportRequestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new Error('Expected multipart field "file".');
    }
    return file.text();
  }
  return request.text();
}

