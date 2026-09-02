import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
