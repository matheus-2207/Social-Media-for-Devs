import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppNavbar } from "@/components/app-navbar";

export default async function SocialLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true } }) : null;
  if (!user) return children;
  return <><AppNavbar username={user.username} /><div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-56">{children}</div></>;
}
