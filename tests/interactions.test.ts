import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({ session: vi.fn(), revalidate: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), transaction: vi.fn(), post: vi.fn(), find: vi.fn(), upsert: vi.fn(), remove: vi.fn(), groupBy: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { comment: { create: mocks.create, deleteMany: mocks.deleteMany }, $transaction: mocks.transaction } }));
import { createComment, deleteComment, toggleReaction } from "@/app/(social)/feed/interaction-actions";
import { summarizeReactions } from "@/lib/interactions";

const tx = { post: { findUnique: mocks.post }, reaction: { findUnique: mocks.find, upsert: mocks.upsert, delete: mocks.remove, groupBy: mocks.groupBy } };
const data = (extra: Record<string, string> = {}) => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ postId: "own-post", content: "  Comentário  ", commentId: "comment-1", type: "FUNCIONA", authorId: "spoofed", ...extra })) form.set(key, value);
  return form;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "user-1" } });
  mocks.transaction.mockImplementation(async (callback) => callback(tx));
  mocks.post.mockResolvedValue({ id: "own-post" });
  mocks.find.mockResolvedValue(null);
  mocks.groupBy.mockResolvedValue([{ type: "FUNCIONA", _count: { _all: 3 } }]);
});

describe("comentários", () => {
  it("permite comentar no próprio post e usa somente a autoria da sessão", async () => {
    mocks.create.mockResolvedValue({ id: "comment-1", createdAt: new Date("2026-09-21T12:00:00Z") });
    expect(await createComment(null, data())).toMatchObject({ success: true, comment: { id: "comment-1", createdAt: "2026-09-21T12:00:00.000Z" } });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: { postId: "own-post", content: "Comentário", authorId: "user-1" } }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/feed");
  });
  it.each([" ", "x".repeat(2001)])("rejeita texto inválido", async content => {
    expect((await createComment(null, data({ content }))).success).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("exclui somente o comentário do usuário, com filtro atômico de autoria e post", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    expect(await deleteComment(null, data())).toEqual({ success: true, deletedCommentId: "comment-1" });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "comment-1", postId: "own-post", authorId: "user-1" } });
    expect(mocks.revalidate).toHaveBeenCalledWith("/feed");
  });
  it("rejeita exclusão de comentário de terceiro ou já removido", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });
    expect((await deleteComment(null, data())).success).toBe(false);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe("reações", () => {
  it.each([null, { type: "CLEAN_CODE" }])("cria ou troca a única reação por usuário/post", async existing => {
    mocks.find.mockResolvedValue(existing);
    expect(await toggleReaction(null, data())).toEqual({ success: true, summary: { counts: { FUNCIONA: 3, CLEAN_CODE: 0, DUVIDOSO: 0 }, selected: "FUNCIONA" } });
    expect(mocks.upsert).toHaveBeenCalledWith({ where: { postId_authorId: { postId: "own-post", authorId: "user-1" } }, create: { postId: "own-post", authorId: "user-1", type: "FUNCIONA" }, update: { type: "FUNCIONA" } });
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/feed");
  });
  it("remove ao clicar novamente no mesmo tipo", async () => {
    mocks.find.mockResolvedValue({ type: "FUNCIONA" });
    expect(await toggleReaction(null, data())).toMatchObject({ success: true, summary: { selected: null } });
    expect(mocks.remove).toHaveBeenCalledWith({ where: { postId_authorId: { postId: "own-post", authorId: "user-1" } } });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("rejeita tipos inválidos e posts removidos", async () => {
    expect((await toggleReaction(null, data({ type: "INVALID" }))).success).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
    mocks.post.mockResolvedValue(null);
    expect((await toggleReaction(null, data())).success).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it.each(["P2034", "P2002"])("repete a transação em conflito %s", async code => {
    mocks.transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("conflict", { code, clientVersion: "6" }));
    expect((await toggleReaction(null, data())).success).toBe(true);
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
  it("encerra após três conflitos com erro tratado", async () => {
    mocks.transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "6" }));
    expect((await toggleReaction(null, data())).success).toBe(false);
    expect(mocks.transaction).toHaveBeenCalledTimes(3);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("conta os três tipos e seleciona somente a reação do usuário atual", () => {
    expect(summarizeReactions([{ authorId: "other", type: "FUNCIONA" }, { authorId: "user-1", type: "DUVIDOSO" }], "user-1")).toEqual({ counts: { FUNCIONA: 1, CLEAN_CODE: 0, DUVIDOSO: 1 }, selected: "DUVIDOSO" });
  });
});

it("exige sessão em todas as ações", async () => {
  mocks.session.mockResolvedValue(null);
  for (const action of [createComment, deleteComment, toggleReaction]) expect((await action(null, data())).success).toBe(false);
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.deleteMany).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("trata falhas de banco sem expor detalhes internos", async () => {
  for (const mock of [mocks.create, mocks.deleteMany, mocks.transaction]) mock.mockRejectedValue(new Error("internal-secret"));
  for (const action of [createComment, deleteComment, toggleReaction]) {
    const result = await action(null, data());
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain("internal-secret");
  }
});
