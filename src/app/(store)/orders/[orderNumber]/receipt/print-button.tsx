"use client";

export function PrintButton() {
  return (
    <button
      className="rounded-md border px-3 py-2 text-sm"
      onClick={() => window.print()}
      type="button"
    >
      Imprimir
    </button>
  );
}

