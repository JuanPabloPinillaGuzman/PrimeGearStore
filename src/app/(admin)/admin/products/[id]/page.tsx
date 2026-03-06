"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const PAYMENT_METHOD_OPTIONS = [
  { id: "mercadopago", label: "Mercado Pago" },
  { id: "contraentrega", label: "Contraentrega" },
];

type Feature = { key: string; value: string };

type ProductData = {
  id: number;
  name: string;
  sku: string | null;
  slug: string | null;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  features: Feature[] | null;
  paymentMethods: string[] | null;
  createdAt: string;
};

type AdminProductResponse = { data: ProductData };
type CategoriesResponse = { data: { items: Array<{ id: number; name: string }> } };

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    void loadProduct();
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}`);
      const payload = (await response.json()) as AdminProductResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No se pudo cargar el producto.");
      }
      const data = payload.data;
      setProduct(data);
      setName(data.name);
      setCategoryId(data.categoryId ? String(data.categoryId) : "");
      setDescription(data.description ?? "");
      setFeatures(data.features ?? []);
      setPaymentMethods(data.paymentMethods ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el producto.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await fetch("/api/admin/products/categories");
      const payload = (await response.json()) as CategoriesResponse | { error?: { message?: string } };
      if (response.ok && "data" in payload) {
        setCategories(payload.data.items);
      }
    } catch {
      // silently ignore
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
        description: description.trim() || null,
        features: features.length > 0 ? features.filter((f) => f.key.trim()) : null,
        paymentMethods: paymentMethods.length > 0 ? paymentMethods : null,
      };
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { data: unknown } | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No se pudo guardar.");
      }
      setMessage("Guardado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  function addFeature() {
    setFeatures((prev) => [...prev, { key: "", value: "" }]);
  }

  function updateFeature(index: number, field: "key" | "value", val: string) {
    setFeatures((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: val } : f)));
  }

  function removeFeature(index: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  }

  function togglePaymentMethod(id: string) {
    setPaymentMethods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Producto no encontrado.{" "}
        <Link href="/admin/products" className="underline">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">ID #{product.id}</p>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.slug && (
            <p className="mt-0.5 text-xs text-muted-foreground">slug: {product.slug}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {product.slug && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/products/${product.slug}`} target="_blank">
                Ver en tienda
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/variants?productId=${product.id}`}>Variantes</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/products/${product.id}/images`}>Imágenes</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/products">← Volver</Link>
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
            <CardDescription>Nombre, categoría y estado.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="product-name" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={180}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="product-category" className="text-sm font-medium">
                Categoría
              </label>
              <Select
                id="product-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">SKU</p>
              <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {product.sku ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Descripción</CardTitle>
            <CardDescription>Texto que aparece en el acordeón &quot;Descripción del producto&quot;.</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={10000}
              placeholder="Describe el producto..."
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {description.length}/10000
            </p>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Características</CardTitle>
            <CardDescription>
              Lista de pares clave–valor mostrados en el acordeón &quot;Características&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {features.map((feat, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Clave (ej. Material)"
                  value={feat.key}
                  onChange={(e) => updateFeature(index, "key", e.target.value)}
                  maxLength={100}
                  className="flex-1"
                />
                <Input
                  placeholder="Valor (ej. Cuero sintético)"
                  value={feat.value}
                  onChange={(e) => updateFeature(index, "value", e.target.value)}
                  maxLength={500}
                  className="flex-[2]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeFeature(index)}
                  className="shrink-0"
                >
                  Quitar
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addFeature}>
              + Agregar característica
            </Button>
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de pago</CardTitle>
            <CardDescription>
              Activa los métodos que aparecerán como badges en la página del producto. Si no se selecciona ninguno, se muestran todos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <label
                  key={method.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm transition hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={paymentMethods.includes(method.id)}
                    onChange={() => togglePaymentMethod(method.id)}
                  />
                  {method.label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button asChild type="button" variant="outline">
            <Link href="/admin/products">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
