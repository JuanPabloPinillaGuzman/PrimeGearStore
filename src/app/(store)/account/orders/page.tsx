import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AccountLayout } from "@/components/store/account/AccountLayout";
import { OrdersList } from "@/components/store/account/OrdersList";

export default async function AccountOrdersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/account/orders");
  }

  return (
    <AccountLayout pathname="/account/orders" title="Mis pedidos" description="Consulta estado, pagos y seguimiento de tus compras.">
      <OrdersList />
    </AccountLayout>
  );
}
