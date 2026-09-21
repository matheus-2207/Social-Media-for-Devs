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
      <body className="min-h-screen bg-white font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}
