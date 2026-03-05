"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { adminNavItems } from "@/components/admin/admin-nav";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/store/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function titleFromPath(pathname: string) {
  const clean = pathname.replace(/^\/admin\/?/, "");
  if (!clean) return "Dashboard";
  const segments = clean.split("/").filter(Boolean);
  const leaf = segments[segments.length - 1] ?? "Admin";
  if (/^\[?.+\]?$/.test(leaf)) return "Detalle";
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 md:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen border-r border-border/50 bg-card/60 backdrop-blur-xl md:flex md:flex-col">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center px-4">
            <Link href="/admin">
              <BrandMark />
            </Link>
          </div>
          <div className="mx-3 h-px bg-border/50" />

          {/* Nav */}
          <ScrollArea className="flex-1 px-2 py-3">
            <nav className="space-y-0.5" aria-label="Navegación de administración">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="mx-3 h-px bg-border/50" />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted-foreground">
              {role === "ADMIN" ? "Administrador" : "Staff"}
            </span>
            <ThemeToggle />
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl md:px-6">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground overflow-hidden">
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.href} className="flex items-center gap-1 shrink-0">
                    {index > 0 && <ChevronRight className="size-3 text-border" />}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="font-medium text-foreground">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="hover:text-foreground transition-colors">
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                ))}
              </nav>
            </div>

            {/* Mobile theme toggle */}
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </header>

          {/* Page title + content */}
          <main className="px-4 py-6 md:px-6">
            <div className="mx-auto w-full max-w-7xl">
              <h1 className="font-display mb-6 text-2xl font-extrabold tracking-tight">{title}</h1>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
