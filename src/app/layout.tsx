import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genect",
  description: "Sistema interno de gestão da Genect Confecções",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body><AdminShell>{children}</AdminShell></body>
    </html>
  );
}
