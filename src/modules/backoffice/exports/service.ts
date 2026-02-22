import { queryOrdersCsv, querySalesCsv, queryStockCsv } from "@/modules/backoffice/exports/repo";

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(headers: string[], rows: Array<Array<unknown>>) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export async function exportOrdersCsv(params: { from: string; to: string }) {
  const rows = await queryOrdersCsv(params.from, params.to);
  return buildCsv(
    ["orderNumber", "status", "currency", "total", "createdAt", "paymentStatus", "saleId"],
    rows.map((row) => [
      row.order_number,
      row.status,
      row.currency,
      row.total.toString(),
      row.created_at.toISOString(),
      row.payment_status,
      row.sale_id?.toString() ?? null,
    ]),
  );
}

export async function exportSalesCsv(params: { from: string; to: string }) {
  const rows = await querySalesCsv(params.from, params.to);
  return buildCsv(
    [
      "saleId",
      "saleDate",
      "status",
      "currency",
      "subtotal",
      "taxTotal",
      "total",
      "customerId",
      "branchId",
      "notes",
    ],
    rows.map((row) => [
      row.sale_id.toString(),
      row.sale_date.toISOString(),
      row.status,
      row.currency,
      row.subtotal.toString(),
      row.tax_total.toString(),
      row.total.toString(),
      row.customer_id,
      row.branch_id,
      row.notes,
    ]),
  );
}

export async function exportStockCsv(params: { branchId?: number }) {
  const rows = await queryStockCsv(params.branchId);
  return buildCsv(
    ["productId", "sku", "name", "branchId", "stockOnHand"],
    rows.map((row) => [
      row.product_id,
      row.sku,
      row.name,
      row.branch_id,
      row.stock_on_hand.toString(),
    ]),
  );
}

