import { z } from "zod";

export const reactionTypes = ["FUNCIONA", "CLEAN_CODE", "DUVIDOSO"] as const;
export type ReactionKind = typeof reactionTypes[number];
export const reactionOptions = [
  { type: "FUNCIONA", label: "Funciona", emoji: "👍" },
  { type: "CLEAN_CODE", label: "Clean code", emoji: "✨" },
  { type: "DUVIDOSO", label: "Duvidoso", emoji: "🤔" },
] as const;

const id = z.string().min(1, "Identificador inválido.").max(128, "Identificador inválido.");
export const commentSchema = z.object({ postId: id, content: z.string().trim().min(1, "Escreva um comentário.").max(2000, "Use no máximo 2.000 caracteres.") });
export const deleteCommentSchema = z.object({ postId: id, commentId: id });
export const reactionSchema = z.object({ postId: id, type: z.enum(reactionTypes, { errorMap: () => ({ message: "Selecione uma reação válida." }) }) });

export type CommentView = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { name: string; avatarUrl: string | null };
};
export type ReactionSummary = { counts: Record<ReactionKind, number>; selected: ReactionKind | null };
export type CommentResult = { success: false; error: string } | { success: true; comment: CommentView } | { success: true; deletedCommentId: string };
export type ReactionResult = { success: false; error: string } | { success: true; summary: ReactionSummary };

export function summarizeReactions(reactions: { authorId: string; type: ReactionKind }[], currentUserId: string | null): ReactionSummary {
  const counts = { FUNCIONA: 0, CLEAN_CODE: 0, DUVIDOSO: 0 };
  let selected: ReactionKind | null = null;
  for (const reaction of reactions) {
    counts[reaction.type]++;
    if (reaction.authorId === currentUserId) selected = reaction.type;
  }
  return { counts, selected };
}
