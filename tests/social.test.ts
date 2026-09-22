import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), revalidate: vi.fn(), users: vi.fn(), userCount: vi.fn(), notifications: vi.fn(), count: vi.fn(), update: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany: mocks.users, count: mocks.userCount }, notification: { findMany: mocks.notifications, count: mocks.count, updateMany: mocks.update } } }));
import { getConnections, getNotifications } from "@/lib/social";
import { markNotificationsRead } from "@/app/(social)/notificacoes/actions";

beforeEach(() => {
  vi.resetAllMocks(); mocks.session.mockResolvedValue({ user: { id: "viewer" } });
  mocks.userCount.mockResolvedValue(30); mocks.users.mockResolvedValue([]);
  mocks.count.mockResolvedValue(30); mocks.notifications.mockResolvedValue([]);
});
it.each([
  ["seguidores" as const, { following: { some: { followingId: "owner" } } }],
  ["seguindo" as const, { followers: { some: { followerId: "owner" } } }],
])("consulta a direção correta da lista %s e pagina", async (kind, where) => {
  expect(await getConnections("owner", kind, "viewer", 2)).toMatchObject({ page: 2, totalPages: 2 });
  expect(mocks.userCount).toHaveBeenCalledWith({ where });
  const args = mocks.users.mock.calls[0][0];
  expect(args).toMatchObject({ where, skip: 20, take: 20, select: { username: true, followers: { where: { followerId: "viewer" } } } });
  expect(args.select).not.toHaveProperty("email"); expect(args.select).not.toHaveProperty("passwordHash");
});
it("listas públicas vazias retornam a primeira página", async () => {
  mocks.userCount.mockResolvedValue(0);
  expect(await getConnections("owner", "seguidores", null, 3)).toMatchObject({ page: 1, users: [] });
});
it("lista apenas notificações do destinatário em ordem recente", async () => {
  expect(await getNotifications("viewer", 2)).toMatchObject({ page: 2, totalPages: 2 });
  expect(mocks.notifications).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "viewer" }, skip: 20, take: 20, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
});
it("marca somente os IDs exibidos pertencentes ao usuário da sessão", async () => {
  expect(await markNotificationsRead(["n1", "n2"])).toEqual({ success: true });
  expect(mocks.update).toHaveBeenCalledWith({ where: { id: { in: ["n1", "n2"] }, userId: "viewer", read: false }, data: { read: true } });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
it("rejeita leitura sem sessão e lotes inválidos", async () => {
  expect((await markNotificationsRead([])).success).toBe(false);
  expect((await markNotificationsRead(Array(21).fill("n1"))).success).toBe(false);
  expect((await markNotificationsRead([""])).success).toBe(false);
  mocks.session.mockResolvedValue(null);
  expect((await markNotificationsRead(["n1"])).success).toBe(false);
  expect(mocks.update).not.toHaveBeenCalled();
});
it("trata falhas de leitura sem expor erros internos", async () => {
  mocks.update.mockRejectedValue(new Error("secret"));
  expect(await markNotificationsRead(["n1"])).toEqual({ success: false });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
