import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (await getServerSession(authOptions)) redirect("/feed");
  return <main className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-12">{children}</main>;
}
