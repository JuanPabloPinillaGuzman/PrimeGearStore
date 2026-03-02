import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AccountLayout } from "@/components/store/account/AccountLayout";
import { AddressesList } from "@/components/store/account/AddressesList";

export default async function AccountAddressesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/account/addresses");
  }

  return (
    <AccountLayout pathname="/account/addresses" title="Direcciones" description="Guarda direcciones de envío y facturación para checkout.">
      <AddressesList />
    </AccountLayout>
  );
}
