import type { ReactNode } from "react";

import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = session?.user?.role ?? null;

  return <AdminShell role={role}>{children}</AdminShell>;
}
