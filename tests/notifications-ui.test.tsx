// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mocks = vi.hoisted(() => ({ read: vi.fn(), count: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/app/(social)/notificacoes/actions", () => ({ markNotificationsRead: mocks.read }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { count: mocks.count } } }));
import { NotificationList } from "@/components/notification-list";
import { NotificationBell } from "@/components/notification-bell";
const item = { id: "n1", read: false, createdAt: "2026-09-21T12:00:00Z", actor: { name: "Ana", username: "ana-dev", avatarUrl: null } };
beforeEach(() => { vi.resetAllMocks(); mocks.read.mockResolvedValue({ success: true }); });
afterEach(cleanup);
it("marca itens visíveis como lidos e mantém link de perfil sem navegar", async () => {
  const url = window.location.href;
  const view = render(<NotificationList notifications={[item, { ...item, id: "n2", read: true }]} />);
  await waitFor(() => expect(mocks.read).toHaveBeenCalledWith(["n1"]));
  expect(screen.getAllByRole("link")[0].getAttribute("href")).toBe("/perfil/ana-dev");
  expect(document.querySelector("form")).toBeNull();
  expect(window.location.href).toBe(url);
  view.rerender(<NotificationList notifications={[{ ...item, read: true }]} />);
  expect(mocks.read).toHaveBeenCalledTimes(1);
});
it("mostra erro e permite repetir a leitura sem submit nativo", async () => {
  mocks.read.mockResolvedValueOnce({ success: false }).mockResolvedValue({ success: true });
  render(<NotificationList notifications={[item]} />);
  await screen.findByRole("alert");
  const retry = screen.getByRole("button", { name: "Tentar novamente" });
  expect(retry.getAttribute("type")).toBe("button");
  await userEvent.setup().click(retry);
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(mocks.read).toHaveBeenCalledTimes(2);
});
it("lista vazia não dispara escrita e sino mostra somente contagem não lida", async () => {
  render(<NotificationList notifications={[]} />);
  expect(mocks.read).not.toHaveBeenCalled();
  mocks.count.mockResolvedValue(3);
  render(await NotificationBell({ userId: "viewer" }));
  expect(mocks.count).toHaveBeenCalledWith({ where: { userId: "viewer", read: false } });
  expect(screen.getByRole("link", { name: "Notificações: 3 não lidas" }).getAttribute("href")).toBe("/notificacoes");
  expect(screen.getByText("3")).toBeTruthy();
});
