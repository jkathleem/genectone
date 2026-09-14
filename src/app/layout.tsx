import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { currentUser } from "@/modules/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genect",
  description: "Sistema interno de gestão da Genect Confecções",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  return (
    <html lang="pt-BR">
      <body>{user ? <AdminShell user={user}>{children}</AdminShell> : children}</body>
    </html>
  );
}
