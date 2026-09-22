"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentSelect } from "@/lib/comment-select";
import { commentSchema, deleteCommentSchema, reactionSchema, type CommentResult, type ReactionResult } from "@/lib/interactions";

export async function createComment(_previous: CommentResult | null, data: FormData): Promise<CommentResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Entre na sua conta para comentar." };
  const parsed = commentSchema.safeParse({ postId: data.get("postId"), content: data.get("content") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  try {
    const comment = await prisma.comment.create({ data: { ...parsed.data, authorId: session.user.id }, select: commentSelect });
    revalidatePath("/feed");
    revalidatePath("/perfil/[username]", "page");
    return { success: true, comment: { ...comment, createdAt: comment.createdAt.toISOString() } };
  } catch {
    return { success: false, error: "Não foi possível comentar. O post pode ter sido removido. Tente novamente." };
  }
}

export async function deleteComment(_previous: CommentResult | null, data: FormData): Promise<CommentResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Entre na sua conta para excluir o comentário." };
  const parsed = deleteCommentSchema.safeParse({ postId: data.get("postId"), commentId: data.get("commentId") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  try {
    const result = await prisma.comment.deleteMany({ where: { id: parsed.data.commentId, postId: parsed.data.postId, authorId: session.user.id } });
    if (!result.count) return { success: false, error: "Comentário não encontrado ou você não tem permissão para excluí-lo." };
    revalidatePath("/feed");
    revalidatePath("/perfil/[username]", "page");
    return { success: true, deletedCommentId: parsed.data.commentId };
  } catch {
    return { success: false, error: "Não foi possível excluir o comentário. Tente novamente." };
  }
}

export async function toggleReaction(_previous: ReactionResult | null, data: FormData): Promise<ReactionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Entre na sua conta para reagir." };
  const parsed = reactionSchema.safeParse({ postId: data.get("postId"), type: data.get("type") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  const { postId, type } = parsed.data;
  const authorId = session.user.id;

  // Serializa a leitura/troca/remoção para manter uma única reação, inclusive entre abas.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const summary = await prisma.$transaction(async (tx) => {
        if (!await tx.post.findUnique({ where: { id: postId }, select: { id: true } })) return null;
        const where = { postId_authorId: { postId, authorId } };
        const existing = await tx.reaction.findUnique({ where, select: { type: true } });
        const selected = existing?.type === type ? null : type;
        if (selected === null) await tx.reaction.delete({ where });
        else await tx.reaction.upsert({ where, create: { postId, authorId, type }, update: { type } });
        const grouped = await tx.reaction.groupBy({ by: ["type"], where: { postId }, _count: { _all: true } });
        const counts = { FUNCIONA: 0, CLEAN_CODE: 0, DUVIDOSO: 0 };
        for (const group of grouped) counts[group.type] = group._count._all;
        return { counts, selected };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
      if (!summary) return { success: false, error: "Este post não está mais disponível." };
      revalidatePath("/feed");
      revalidatePath("/perfil/[username]", "page");
      return { success: true, summary };
    } catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002");
      if (!conflict || attempt === 2) return { success: false, error: "Não foi possível atualizar sua reação. Tente novamente." };
    }
  }
  return { success: false, error: "Não foi possível atualizar sua reação. Tente novamente." };
}
