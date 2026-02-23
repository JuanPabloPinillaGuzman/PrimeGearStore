"use client";

import { RecommendedProductsSection } from "@/components/store/RecommendedProductsSection";

export function AccountRecommendations() {
  return (
    <RecommendedProductsSection
      title="Recomendado para ti"
      endpoint="/api/store/me/recommendations?limit=8"
      emptyDescription="Aun no tenemos suficientes señales. Agrega favoritos o realiza una compra."
    />
  );
}

