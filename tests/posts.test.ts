import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), revalidate: vi.fn(),
  create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn(), findMany: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { post: mocks } }));

import { createPost, updatePost, deletePost, createPostFromForm, updatePostFromForm, deletePostFromForm } from "@/app/(social)/feed/actions";
import { postSchema } from "@/lib/validation/post";
import { getFeedPage, parsePage } from "@/lib/posts";
import { highlightCode } from "@/lib/highlight-code";
import { relativeDate } from "@/lib/format-date";
import { commentSelect } from "@/lib/comment-select";

const input = { content: "Aprendendo TypeScript", codeSnippet: "  const n = 1;\n", language: "typescript", isQuestion: true };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "author-1" } });
});

describe("validação de posts", () => {
  it("preserva espaços do código e remove espaços externos do texto", () => {
    expect(postSchema.parse({ ...input, content: "  texto  " })).toEqual({ ...input, content: "texto" });
  });
  it("aceita post só de texto e remove linguagem sem código", () => {
    expect(postSchema.parse({ content: "Olá", language: "javascript", codeSnippet: " \n" })).toEqual({ content: "Olá", codeSnippet: null, language: null, isQuestion: false });
  });
  it("usa texto simples quando o código não tem linguagem", () => {
    expect(postSchema.parse({ content: "Exemplo", codeSnippet: "x" }).language).toBe("plaintext");
  });
  it.each([
    { ...input, content: " \n " }, { ...input, content: "x".repeat(5001) },
    { ...input, codeSnippet: "x".repeat(20001) }, { ...input, language: "unknown" },
    { ...input, isQuestion: "true" },
  ])("rejeita entrada inválida", (value) => {
    expect(postSchema.safeParse(value).success).toBe(false);
  });
});

describe("autorização das Server Actions", () => {
  it("só exclui pelo formulário após confirmação explícita e com sessão", async () => {
    const data = new FormData();
    data.set("postId", "post-1");
    expect((await deletePostFromForm(null, data)).success).toBe(false);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    data.set("confirmDelete", "yes");
    mocks.session.mockResolvedValue(null);
    expect((await deletePostFromForm(null, data)).success).toBe(false);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    mocks.session.mockResolvedValue({ user: { id: "author-1" } });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    expect(await deletePostFromForm(null, data)).toEqual({ success: true });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "post-1", authorId: "author-1" } });
  });
  it("cria a partir de FormData, ignorando autor e metadados enviados pelo navegador", async () => {
    mocks.create.mockResolvedValue({ id: "post-1" });
    const data = new FormData();
    data.set("content", input.content);
    data.set("codeSnippet", input.codeSnippet);
    data.set("language", input.language);
    data.set("isQuestion", "on");
    data.set("authorId", "other-user");
    data.set("$ACTION_ID_test", "metadata");
    expect(await createPostFromForm(null, data)).toEqual({ success: true });
    expect(mocks.create).toHaveBeenCalledWith({ data: { ...input, authorId: "author-1" }, select: { id: true } });
  });
  it("edita a partir de FormData usando o ID enviado no corpo e autoria da sessão", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    const data = new FormData();
    data.set("content", "Texto editado");
    data.set("id", "other-post");
    data.set("postId", "post-1");
    expect(await updatePostFromForm(null, data)).toEqual({ success: true, updatedPost: { id: "post-1", content: "Texto editado", codeSnippet: null, language: null, isQuestion: false, highlightedCode: null } });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "post-1", authorId: "author-1" },
      data: { content: "Texto editado", codeSnippet: null, language: null, isQuestion: false },
    });
  });
  it("devolve erros do formulário sem criar posts inválidos ou sem sessão", async () => {
    const data = new FormData();
    data.set("content", "  ");
    expect((await createPostFromForm(null, data)).success).toBe(false);
    mocks.session.mockResolvedValue(null);
    data.set("content", "Texto válido");
    expect((await createPostFromForm(null, data)).success).toBe(false);
    data.set("postId", "post-1");
    expect((await updatePostFromForm(null, data)).success).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("não aceita ID de terceiro sem validar autoria nem ID ausente nos formulários", async () => {
    const data = new FormData();
    data.set("content", "Tentativa");
    data.set("confirmDelete", "yes");
    expect((await updatePostFromForm(null, data)).success).toBe(false);
    expect((await deletePostFromForm(null, data)).success).toBe(false);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    data.set("postId", "another-user-post");
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.deleteMany.mockResolvedValue({ count: 0 });
    expect((await updatePostFromForm(null, data)).success).toBe(false);
    expect((await deletePostFromForm(null, data)).success).toBe(false);
    expect(mocks.updateMany.mock.calls[0][0].where).toEqual({ id: "another-user-post", authorId: "author-1" });
    expect(mocks.deleteMany.mock.calls[0][0].where).toEqual({ id: "another-user-post", authorId: "author-1" });
  });
  it("bloqueia todas as mutações sem sessão", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await createPost(input)).success).toBe(false);
    expect((await updatePost("post-1", input)).success).toBe(false);
    expect((await deletePost("post-1")).success).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
  it("atribui o autor pela sessão, ignorando um authorId enviado pelo cliente", async () => {
    mocks.create.mockResolvedValue({ id: "post-1" });
    expect(await createPost({ ...input, authorId: "other-user" })).toEqual({ success: true });
    expect(mocks.create).toHaveBeenCalledWith({ data: { ...input, authorId: "author-1" }, select: { id: true } });
    expect(mocks.revalidate).toHaveBeenCalledWith("/feed");
  });
  it("rejeita dados inválidos antes da criação ou edição", async () => {
    expect((await createPost({ content: "" })).success).toBe(false);
    expect((await updatePost("post-1", { content: "" })).success).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("edita somente com filtro atômico de autoria e limpa código removido", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    expect(await updatePost("post-1", { content: "Texto editado", codeSnippet: "" })).toEqual({ success: true, updatedPost: { id: "post-1", content: "Texto editado", codeSnippet: null, language: null, isQuestion: false, highlightedCode: null } });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "post-1", authorId: "author-1" },
      data: { content: "Texto editado", codeSnippet: null, language: null, isQuestion: false },
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/feed");
  });
  it("retorna os dados salvos e código destacado seguro para atualizar o card", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    const result = await updatePost("post-1", { ...input, codeSnippet: '<script>alert("x")</script>', language: "xml" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updatedPost).toMatchObject({ id: "post-1", content: input.content, language: "xml", isQuestion: true });
    expect(result.updatedPost?.highlightedCode).toContain("hljs-");
    expect(result.updatedPost?.highlightedCode).not.toContain("<script>");
    expect(mocks.revalidate).toHaveBeenCalledWith("/feed");
  });
  it("rejeita editar ou excluir um post de outro autor ou já removido", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.deleteMany.mockResolvedValue({ count: 0 });
    expect((await updatePost("other-post", input)).success).toBe(false);
    expect((await deletePost("other-post")).success).toBe(false);
    expect(mocks.updateMany.mock.calls[0][0].where).toEqual({ id: "other-post", authorId: "author-1" });
    expect(mocks.deleteMany.mock.calls[0][0].where).toEqual({ id: "other-post", authorId: "author-1" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("exclui o post do autor e atualiza o feed", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    expect(await deletePost("post-1")).toEqual({ success: true });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "post-1", authorId: "author-1" } });
    expect(mocks.revalidate).toHaveBeenCalledWith("/feed");
  });
  it("não expõe falhas internas do banco", async () => {
    mocks.create.mockRejectedValue(new Error("internal-secret"));
    mocks.updateMany.mockRejectedValue(new Error("internal-secret"));
    mocks.deleteMany.mockRejectedValue(new Error("internal-secret"));
    for (const result of [await createPost(input), await updatePost("post-1", input), await deletePost("post-1")]) {
      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).not.toContain("internal-secret");
    }
  });
});

describe("paginação do feed", () => {
  it.each([undefined, "0", "-1", "1.5", "abc", "99999999999999999", ["2"]])("trata página inválida como primeira página", (value) => {
    expect(parsePage(value)).toBe(1);
  });
  it("lista a segunda página com ordenação estável e dados públicos do autor", async () => {
    mocks.count.mockResolvedValue(25);
    mocks.findMany.mockResolvedValue([]);
    expect(await getFeedPage(parsePage("2"))).toMatchObject({ page: 2, totalPages: 3, total: 25 });
    expect(mocks.findMany).toHaveBeenCalledWith({
      skip: 10, take: 10, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        author: { select: { id: true, name: true, username: true, avatarUrl: true } },
        comments: { select: commentSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
        reactions: { select: { authorId: true, type: true } },
      },
    });
  });
  it("volta à última página válida após exclusões", async () => {
    mocks.count.mockResolvedValue(10);
    mocks.findMany.mockResolvedValue([]);
    expect(await getFeedPage(2)).toMatchObject({ page: 1, totalPages: 1 });
    expect(mocks.findMany.mock.calls[0][0].skip).toBe(0);
  });
  it("suporta feed vazio", async () => {
    mocks.count.mockResolvedValue(0);
    mocks.findMany.mockResolvedValue([]);
    expect(await getFeedPage(1)).toEqual({ posts: [], page: 1, total: 0, totalPages: 1 });
  });
});

describe("apresentação segura", () => {
  it("destaca código e escapa HTML executável", () => {
    expect(highlightCode("const value = 1;", "javascript")).toContain("hljs-keyword");
    const html = highlightCode('<script>alert("x")</script>', "xml");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;");
    expect(highlightCode("<img onerror=alert(1)>", "unknown")).toBe("&lt;img onerror=alert(1)&gt;");
  });
  it("formata datas relativas em português", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    expect(relativeDate(new Date("2026-09-21T10:00:00Z"), now)).toBe("há 2 horas");
    expect(relativeDate(now, now)).toBe("agora");
  });
});
