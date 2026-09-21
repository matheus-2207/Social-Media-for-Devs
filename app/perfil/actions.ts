"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FollowResult } from "@/lib/follow";

export async function setFollow(_previous: FollowResult | null, data: FormData): Promise<FollowResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Entre na sua conta para seguir pessoas." };
  const followingId = data.get("userId");
  const intent = data.get("intent");
  if (typeof followingId !== "string" || !followingId || followingId.length > 128 || !["follow", "unfollow"].includes(String(intent))) return { success: false, error: "Solicitação inválida." };
  if (followingId === session.user.id) return { success: false, error: "Você não pode seguir a si mesmo." };
  const followerId = session.user.id;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const summary = await prisma.$transaction(async tx => {
        if (!await tx.user.findUnique({ where: { id: followingId }, select: { id: true } })) return null;
        if (intent === "follow") await tx.follow.upsert({
          where: { followerId_followingId: { followerId, followingId } },
          create: { followerId, followingId }, update: {},
        });
        else await tx.follow.deleteMany({ where: { followerId, followingId } });
        return { following: intent === "follow", followers: await tx.follow.count({ where: { followingId } }) };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
      if (!summary) return { success: false, error: "Perfil não encontrado." };
      revalidatePath("/perfil/[username]", "page");
      return { success: true, summary };
    } catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code);
      if (!conflict || attempt === 2) return { success: false, error: "Não foi possível atualizar. Tente novamente." };
    }
  }
  return { success: false, error: "Não foi possível atualizar. Tente novamente." };
}
