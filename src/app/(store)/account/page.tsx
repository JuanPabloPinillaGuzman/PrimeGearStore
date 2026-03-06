import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AccountLayout } from "@/components/store/account/AccountLayout";
import { AccountRecommendations } from "@/components/store/account/AccountRecommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMe } from "@/modules/account/account.service";

export default async function AccountOverviewPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/account");
  }
  const me = await getMe(session.user);

  return (
    <AccountLayout pathname="/account" title="Mi cuenta" description="Gestiona pedidos, direcciones y datos básicos.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Nombre:</span> {me.customer?.fullName ?? me.name ?? "—"}</p>
            <p><span className="text-muted-foreground">Email:</span> {me.email}</p>
            <p><span className="text-muted-foreground">Rol:</span> {me.role}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline"><Link href="/account/orders">Ver mis pedidos</Link></Button>
            <Button asChild variant="outline"><Link href="/account/addresses">Gestionar direcciones</Link></Button>
            <Button asChild><Link href="/store">Ir a la tienda</Link></Button>
          </CardContent>
        </Card>
      </div>
      <AccountRecommendations />
    </AccountLayout>
  );
}
