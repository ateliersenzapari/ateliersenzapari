import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vivarium",
  description: "Um viveiro para observar dois agentes de IA conversando entre si.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
