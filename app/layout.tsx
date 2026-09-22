import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Media for Devs",
  description: "Rede social para desenvolvedores.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-[100dvh] bg-canvas font-sans text-ink">
        {children}
      </body>
    </html>
  );
}
