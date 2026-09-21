import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), revalidate: vi.fn(), user: vi.fn(), relationship: vi.fn(), posts: vi.fn(), postCount: vi.fn(), transaction: vi.fn(), upsert: vi.fn(), remove: vi.fn(), count: vi.fn(), fetch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: mocks.user }, follow: { findUnique: mocks.relationship }, post: { findMany: mocks.posts, count: mocks.postCount }, $transaction: mocks.transaction,
} }));
import { getProfile, getProfilePosts } from "@/lib/profile";
import { getGithubRepositories } from "@/lib/github";
import { setFollow } from "@/app/perfil/actions";
const form = (intent = "follow", userId = "target") => { const data = new FormData(); data.set("intent", intent); data.set("userId", userId); data.set("followerId", "spoofed"); return data; };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch);
  mocks.session.mockResolvedValue({ user: { id: "viewer" } });
  mocks.user.mockResolvedValue({ id: "target", username: "ana", _count: { followers: 2, following: 3 } });
  mocks.transaction.mockImplementation(callback => callback({ user: { findUnique: mocks.user }, follow: { upsert: mocks.upsert, deleteMany: mocks.remove, count: mocks.count } }));
  mocks.count.mockResolvedValue(3);
});
afterEach(() => vi.unstubAllGlobals());

it("carrega perfil público sem sessão e sem selecionar email ou senha", async () => {
  expect(await getProfile("ANA", null)).toMatchObject({ username: "ana", isFollowing: false });
  expect(mocks.user.mock.calls[0][0].where).toEqual({ username: "ana" });
  expect(mocks.user.mock.calls[0][0].select).not.toHaveProperty("email");
  expect(mocks.user.mock.calls[0][0].select).not.toHaveProperty("passwordHash");
  expect(mocks.relationship).not.toHaveBeenCalled();
});
it("consulta a relação correta e trata perfil inexistente", async () => {
  mocks.relationship.mockResolvedValue({ followerId: "viewer" });
  expect(await getProfile("ana", "viewer")).toMatchObject({ isFollowing: true });
  expect(mocks.relationship).toHaveBeenCalledWith({ where: { followerId_followingId: { followerId: "viewer", followingId: "target" } }, select: { followerId: true } });
  mocks.user.mockResolvedValue(null);
  expect(await getProfile("missing", null)).toBeNull();
});
it("pagina somente posts do dono do perfil, mais recentes primeiro", async () => {
  mocks.postCount.mockResolvedValue(25); mocks.posts.mockResolvedValue([]);
  expect(await getProfilePosts("target", 2)).toMatchObject({ page: 2, totalPages: 3 });
  expect(mocks.posts).toHaveBeenCalledWith(expect.objectContaining({ where: { authorId: "target" }, skip: 10, take: 10, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
});
it("seguir é idempotente, usa autoria da sessão e revalida perfis", async () => {
  expect(await setFollow(null, form())).toEqual({ success: true, summary: { following: true, followers: 3 } });
  expect(mocks.upsert).toHaveBeenCalledWith({ where: { followerId_followingId: { followerId: "viewer", followingId: "target" } }, create: { followerId: "viewer", followingId: "target" }, update: {} });
  expect(mocks.revalidate).toHaveBeenCalledWith("/perfil/[username]", "page");
});
it("deixa de seguir somente a relação do usuário atual", async () => {
  expect(await setFollow(null, form("unfollow"))).toMatchObject({ success: true, summary: { following: false } });
  expect(mocks.remove).toHaveBeenCalledWith({ where: { followerId: "viewer", followingId: "target" } });
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("bloqueia auto-follow, entradas inválidas e visitantes", async () => {
  expect((await setFollow(null, form("follow", "viewer"))).success).toBe(false);
  expect((await setFollow(null, form("invalid"))).success).toBe(false);
  mocks.session.mockResolvedValue(null);
  expect((await setFollow(null, form())).success).toBe(false);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("trata perfil removido e falha no banco", async () => {
  mocks.user.mockResolvedValue(null);
  expect((await setFollow(null, form())).success).toBe(false);
  expect(mocks.upsert).not.toHaveBeenCalled();
  mocks.transaction.mockRejectedValue(new Error("secret"));
  const result = await setFollow(null, form());
  expect(result.success).toBe(false); expect(JSON.stringify(result)).not.toContain("secret");
});
it("busca somente três repositórios públicos recentes e preserva campos nulos", async () => {
  const repo = { id: 1, name: "example", html_url: "https://github.com/ana/example", description: null, language: null };
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => [repo] });
  expect(await getGithubRepositories("ana")).toEqual([repo]);
  expect(mocks.fetch).toHaveBeenCalledWith("https://api.github.com/users/ana/repos?sort=updated&per_page=3", expect.objectContaining({ next: { revalidate: 300 }, signal: expect.any(AbortSignal) }));
});
it.each([403, 404, 429, 500])("tolera erro HTTP %i do GitHub", async status => {
  mocks.fetch.mockResolvedValue({ ok: false, status });
  expect(await getGithubRepositories("ana")).toBeNull();
});
it("tolera timeout, JSON inválido e usuário sem GitHub", async () => {
  expect(await getGithubRepositories(null)).toEqual([]);
  expect(mocks.fetch).not.toHaveBeenCalled();
  mocks.fetch.mockRejectedValue(new DOMException("Timeout", "TimeoutError"));
  expect(await getGithubRepositories("ana")).toBeNull();
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ message: "error" }) });
  expect(await getGithubRepositories("ana")).toBeNull();
});
