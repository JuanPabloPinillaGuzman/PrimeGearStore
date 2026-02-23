import { Suspense } from "react";
import StoreCatalogClient from "./StoreCatalogClient";

export default function StorePage() {
  return (
    <Suspense fallback={null}>
      <StoreCatalogClient />
    </Suspense>
  );
}
