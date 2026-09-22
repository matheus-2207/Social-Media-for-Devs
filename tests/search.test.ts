import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), findMany: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany: mocks.findMany } } }));
import { GET } from "@/app/api/usuarios/route";
import { searchUsers } from "@/lib/user-search";
beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({ user: { id: "viewer" } }); mocks.findMany.mockResolvedValue([]); });
it("busca parcialmente username ou nome sem diferenciar maiúsculas", async () => {
  mocks.findMany.mockResolvedValue([{ id: "u", name: "Matheus", username: "matheus", avatarUrl: null, followers: [{ followerId: "viewer" }], _count: { followers: 2, following: 3 } }]);
  expect(await searchUsers(" @Mat ", "viewer")).toEqual([{ id: "u", name: "Matheus", username: "matheus", avatarUrl: null, isFollowing: true, followers: 2, following: 3 }]);
  expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { OR: [{ username: { contains: "Mat", mode: "insensitive" } }, { name: { contains: "Mat", mode: "insensitive" } }] }, take: 20 }));
  const select = mocks.findMany.mock.calls[0][0].select;
  expect(select).not.toHaveProperty("email"); expect(select).not.toHaveProperty("passwordHash");
  expect(select.followers.where).toEqual({ followerId: "viewer" });
});
it("consulta vazia não acessa o banco e curingas são literais", async () => {
  expect(await searchUsers(" @ ", "viewer")).toEqual([]);
  expect(mocks.findMany).not.toHaveBeenCalled();
  await searchUsers("a_b%", "viewer");
  expect(mocks.findMany.mock.calls[0][0].where.OR[0].username.contains).toBe("a\\_b\\%");
});
it("API exige sessão e valida tamanho", async () => {
  mocks.session.mockResolvedValue(null);
  expect((await GET(new Request("http://localhost/api/usuarios?q=mat"))).status).toBe(401);
  mocks.session.mockResolvedValue({ user: { id: "viewer" } });
  expect((await GET(new Request(`http://localhost/api/usuarios?q=${"a".repeat(101)}`))).status).toBe(400);
  expect(mocks.findMany).not.toHaveBeenCalled();
});
it("API retorna dados sem cache compartilhado e trata erros", async () => {
  const response = await GET(new Request("http://localhost/api/usuarios?q=mat"));
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ users: [] });
  mocks.findMany.mockRejectedValue(new Error("secret"));
  const failed = await GET(new Request("http://localhost/api/usuarios?q=mat"));
  expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("secret");
});
