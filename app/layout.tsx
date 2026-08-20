import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile-nav.css";
import "./brand-green.css";
import "./service-polish.css";
import AppRouteBridge from "./app-route-bridge";

export const metadata: Metadata = {
  title: "Cocktaillo POS",
  description: "Cocktaillo POS — Resto Café.",
  icons: { icon: "/cocktaillo-logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#123f2b",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AppRouteBridge />{children}</body>
    </html>
  );
}
