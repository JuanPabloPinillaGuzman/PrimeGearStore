"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { adminNavItems } from "@/components/admin/admin-nav";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function titleFromPath(pathname: string) {
  const clean = pathname.replace(/^\/admin\/?/, "");
  if (!clean) return "Dashboard";
  const segments = clean.split("/").filter(Boolean);
  const leaf = segments[segments.length - 1] ?? "Admin";
  if (/^\[?.+\]?$/.test(leaf)) return "Detail";
  return leaf
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function breadcrumbsFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  let current = "";
  return segments.map((segment) => {
    current += `/${segment}`;
    return {
      href: current,
      label:
        segment === "admin"
          ? "Admin"
          : segment
              .split("-")
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(" "),
    };
  });
}

export function AdminShell({
  children,
  role,
}: {
  children: ReactNode;
  role?: string | null;
}) {
  const pathname = usePathname();
  const title = titleFromPath(pathname);
  const breadcrumbs = breadcrumbsFromPath(pathname);
  const navItems = adminNavItems.filter((item) => !(item.adminOnly && role !== "ADMIN"));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-background/70 backdrop-blur">
          <div className="sticky top-0 flex h-16 items-center px-4">
            <Link href="/admin">
              <BrandMark />
            </Link>
          </div>
          <Separator />
          <ScrollArea className="h-[calc(100vh-65px)] px-3 py-3">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={active ? "secondary" : "ghost"}
                    className={cn("w-full justify-start", active && "shadow-sm")}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
            <div className="px-4 py-3 md:px-6">
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.href} className="flex items-center gap-2">
                    {index > 0 && <span>/</span>}
                    {index === breadcrumbs.length - 1 ? (
                      <span>{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="hover:text-foreground">
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                ))}
              </div>
              <div className="mt-1 flex items-center justify-between gap-4">
                <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
              </div>
            </div>
          </header>
          <main className="px-4 py-6 md:px-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
