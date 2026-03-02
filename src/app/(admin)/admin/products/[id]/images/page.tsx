"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { formatDateTime } from "@/components/admin/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ImageRow = {
  id: string;
  productId: number;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
};

type ImagesResponse = {
  data: {
    productId: number;
    items: ImageRow[];
  };
};

export default function AdminProductImagesPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);

  const [items, setItems] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  async function loadImages() {
    if (!Number.isFinite(productId)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`);
      const payload = (await response.json()) as ImagesResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar imágenes.");
      }
      setItems(payload.data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar imágenes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          alt: alt || undefined,
          isPrimary,
        }),
      });
      const payload = (await response.json()) as { data?: ImageRow; error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible agregar la imagen.");
      }
      setMessage("Imagen agregada.");
      setUrl("");
      setAlt("");
      setIsPrimary(items.length === 0);
      await loadImages();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No fue posible agregar la imagen.");
    } finally {
      setSaving(false);
    }
  }

  async function patchImage(imageId: string, body: { alt?: string; isPrimary?: boolean; sortOrder?: number }) {
    const response = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { data?: ImageRow; error?: { message?: string } };
    if (!response.ok || !("data" in payload)) {
      throw new Error(("error" in payload && payload.error?.message) || "No fue posible actualizar la imagen.");
    }
  }

  async function deleteImage(imageId: string) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}/images/${imageId}`, { method: "DELETE" });
      const payload = (await response.json()) as { data?: { deleted: boolean }; error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible eliminar la imagen.");
      }
      setMessage("Imagen eliminada.");
      await loadImages();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar la imagen.");
    }
  }

  async function setPrimary(imageId: string) {
    setError(null);
    setMessage(null);
    try {
      await patchImage(imageId, { isPrimary: true });
      setMessage("Imagen principal actualizada.");
      await loadImages();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No fue posible actualizar.");
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const current = items[index];
    const target = items[index + direction];
    if (!current || !target) return;
    setError(null);
    setMessage(null);
    try {
      await Promise.all([
        patchImage(current.id, { sortOrder: target.sortOrder }),
        patchImage(target.id, { sortOrder: current.sortOrder }),
      ]);
      setMessage("Orden actualizado.");
      await loadImages();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "No fue posible reordenar.");
    }
  }

  const title = useMemo(() => (Number.isFinite(productId) ? `Producto #${productId}` : "Producto"), [productId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">Gestiona imágenes por URL (sin storage integrado).</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/products">Volver a productos</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregar imagen</CardTitle>
          <CardDescription>Pega una URL pública. Puedes marcarla como principal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_240px_auto_auto]" onSubmit={handleCreate}>
            <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} required />
            <Input placeholder="Alt (opcional)" value={alt} onChange={(e) => setAlt(e.target.value)} />
            <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
              <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
              Principal
            </label>
            <Button disabled={saving} type="submit">
              {saving ? "Guardando..." : "Agregar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Imágenes</CardTitle>
          <CardDescription>Reordena con ↑↓, marca una sola principal y elimina si no aplica.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Alt</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <AdminTableSkeleton rows={4} columns={7} />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <AdminEmptyState title="Sin imágenes" description="Agrega la primera imagen por URL para este producto." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={item.alt ?? "Preview"}
                            className="h-12 w-16 rounded-md border object-cover"
                          />
                        </TableCell>
                        <TableCell className="max-w-[240px]">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-primary hover:underline"
                          >
                            {item.url}
                          </a>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">{item.alt ?? "—"}</TableCell>
                        <TableCell>{item.sortOrder}</TableCell>
                        <TableCell>
                          {item.isPrimary ? <Badge>Principal</Badge> : <Badge variant="outline">Secundaria</Badge>}
                        </TableCell>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void moveImage(index, -1)}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void moveImage(index, 1)}
                              disabled={index === items.length - 1}
                            >
                              ↓
                            </Button>
                            {!item.isPrimary && (
                              <Button type="button" size="sm" variant="outline" onClick={() => void setPrimary(item.id)}>
                                Principal
                              </Button>
                            )}
                            <Button type="button" size="sm" variant="destructive" onClick={() => void deleteImage(item.id)}>
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
