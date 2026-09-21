"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { highlightCode } from "@/lib/highlight-code";
import { postSchema, type PostActionResult } from "@/lib/validation/post";

function postInputFromForm(data: FormData) {
  return {
    content: data.get("content"),
    codeSnippet: data.get("codeSnippet"),
    language: data.get("language"),
    isQuestion: data.get("isQuestion") === "on",
  };
}

export async function createPostFromForm(
  _previousState: PostActionResult | null,
  data: FormData,
): Promise<PostActionResult> {
  return createPost(postInputFromForm(data));
}

export async function updatePostFromForm(
  _previousState: PostActionResult | null,
  data: FormData,
): Promise<PostActionResult> {
  const id = data.get("postId");
  if (typeof id !== "string") return { success: false, error: "Post inválido." };
  return updatePost(id, postInputFromForm(data));
}

export async function createPost(input: unknown): Promise<PostActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Entre na sua conta para publicar." };
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  try {
    await prisma.post.create({ data: { ...parsed.data, authorId: session.user.id }, select: { id: true } });
  } catch {
    return { success: false, error: "Não foi possível publicar. Tente novamente." };
  }
  revalidatePath("/feed");
  revalidatePath("/perfil/[username]", "page");
  return { success: true };
}

export async function deletePostFromForm(
  _previousState: PostActionResult | null,
  data: FormData,
): Promise<PostActionResult> {
  if (data.get("confirmDelete") !== "yes") {
    return { success: false, error: "Confirme a exclusão do post." };
  }
  const id = data.get("postId");
  if (typeof id !== "string") return { success: false, error: "Post inválido." };
  return deletePost(id);
}

export async function updatePost(id: string, input: unknown): Promise<PostActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Entre na sua conta para editar." };
  if (typeof id !== "string" || !id || id.length > 128) return { success: false, error: "Post inválido." };
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  const updatedPost = {
    id,
    ...parsed.data,
    highlightedCode: parsed.data.codeSnippet ? highlightCode(parsed.data.codeSnippet, parsed.data.language) : null,
  };
  try {
    // A autoria faz parte da própria escrita, evitando alterações em posts de terceiros.
    const result = await prisma.post.updateMany({ where: { id, authorId: session.user.id }, data: parsed.data });
    if (!result.count) return { success: false, error: "Post não encontrado ou você não tem permissão para editá-lo." };
  } catch {
    return { success: false, error: "Não foi possível editar. Tente novamente." };
  }
  revalidatePath("/feed");
  revalidatePath("/perfil/[username]", "page");
  return { success: true, updatedPost };
}

export async function deletePost(id: string): Promise<PostActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Entre na sua conta para excluir." };
  if (typeof id !== "string" || !id || id.length > 128) return { success: false, error: "Post inválido." };
  try {
    const result = await prisma.post.deleteMany({ where: { id, authorId: session.user.id } });
    if (!result.count) return { success: false, error: "Post não encontrado ou você não tem permissão para excluí-lo." };
  } catch {
    return { success: false, error: "Não foi possível excluir. Tente novamente." };
  }
  revalidatePath("/feed");
  revalidatePath("/perfil/[username]", "page");
  return { success: true };
}
