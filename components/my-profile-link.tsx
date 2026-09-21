import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function MyProfileLink({ userId }: { userId: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  return user ? <Link href={`/perfil/${encodeURIComponent(user.username)}`} className="text-sm font-semibold text-indigo-600 hover:underline">Meu perfil</Link> : null;
}
