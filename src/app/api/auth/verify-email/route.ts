import { redirect } from "next/navigation";

import { verifyEmailToken } from "@/modules/auth/auth.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  try {
    await verifyEmailToken(token);
    redirect("/login?verified=1");
  } catch {
    redirect("/login?verified=error");
  }
}
