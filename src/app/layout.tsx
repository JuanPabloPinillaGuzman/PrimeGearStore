import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import { ClientErrorReporter } from "@/components/observability/ClientErrorReporter";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PrimeGearStore",
  description: "Storefront and backoffice for PrimeGearStore",
  icons: {
    icon: "/icon.svg",
  },
  applicationName: "PrimeGearStore",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} ${dmSans.variable} antialiased`}>
        <ClientErrorReporter />
        {children}
      </body>
    </html>
  );
}
