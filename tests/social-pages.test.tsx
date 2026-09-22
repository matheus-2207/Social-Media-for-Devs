// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ session: vi.fn(), profile: vi.fn(), connections: vi.fn(), posts: vi.fn(), signOut: vi.fn() }));
vi.mock("next-auth/react", () => ({ signOut: mocks.signOut }));
vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/posts", () => ({ parsePage: () => 1 }));
vi.mock("@/lib/profile", () => ({ getProfile: mocks.profile, getProfilePosts: mocks.posts }));
vi.mock("@/lib/social", () => ({ getConnections: mocks.connections }));
vi.mock("@/components/notification-bell", () => ({ NotificationBell: () => null }));
vi.mock("@/components/profile-follow", () => ({ ProfileFollow: () => <button type="button">Seguir pessoa</button> }));
vi.mock("@/components/posts/post-card-shell", () => ({ PostCardShell: ({ children }: { children: ReactNode }) => <article>{children}</article> }));
vi.mock("@/components/posts/comment-list", () => ({ CommentList: () => null }));
vi.mock("@/components/posts/reaction-bar", () => ({ ReactionBar: () => null }));
import ConnectionsPage from "@/app/(social)/perfil/[username]/[relationship]/page";
import ProfilePage from "@/app/(social)/perfil/[username]/page";
import { PostCard } from "@/components/posts/post-card";
const props = { params: { username: "owner", relationship: "seguidores" }, searchParams: {} };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.profile.mockResolvedValue({ id: "owner", username: "owner", name: "Dono", avatarUrl: null, _count: { followers: 0, following: 0 } });
  mocks.posts.mockResolvedValue({ posts: [], page: 1, totalPages: 1 });
  mocks.connections.mockResolvedValue({ users: [{ id: "other", name: "Ana", username: "ana", avatarUrl: null, followers: [], _count: { followers: 2, following: 3 } }], page: 1, totalPages: 1, total: 1 });
});
afterEach(cleanup);
it.each([null, { user: { id: "visitor" } }])("não mostra logout no perfil para visitantes ou outra pessoa", async session => {
  mocks.session.mockResolvedValue(session);
  render(await ProfilePage(props));
  expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
  expect(screen.queryByText("Meu perfil")).toBeNull();
  expect(screen.queryByRole("link", { name: "Feed" })).toBeNull();
});
it("o logout funciona pelo próprio perfil", async () => {
  mocks.session.mockResolvedValue({ user: { id: "owner" } });
  mocks.signOut.mockResolvedValue(undefined);
  render(await ProfilePage(props));
  expect(screen.queryByRole("link", { name: "Feed" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Sair" }));
  await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith({ callbackUrl: "/login" }));
});
it.each([null, { user: { id: "visitor" } }])("lista pública mostra perfis, sem controles para visitantes", async session => {
  mocks.session.mockResolvedValue(session);
  render(await ConnectionsPage(props));
  expect(screen.getByRole("link", { name: /Ana @ana/ }).getAttribute("href")).toBe("/perfil/ana");
  expect(screen.queryByRole("button")).toBeNull();
});
it("o dono pode seguir pessoas na própria lista", async () => {
  mocks.session.mockResolvedValue({ user: { id: "owner" } });
  render(await ConnectionsPage(props));
  expect(screen.getByRole("button", { name: "Seguir pessoa" })).toBeTruthy();
});
it("rotas de lista desconhecidas retornam not found", async () => {
  await expect(ConnectionsPage({ ...props, params: { ...props.params, relationship: "invalid" } })).rejects.toThrow("not-found");
  expect(mocks.connections).not.toHaveBeenCalled();
});
it("avatar e nome do autor no PostCard linkam ao username", () => {
  render(<PostCard currentUserId={null} post={{ id: "p1", authorId: "a1", content: "Olá", codeSnippet: null, language: null, isQuestion: false, createdAt: new Date(), author: { id: "a1", name: "Ana", username: "ana-dev", avatarUrl: null }, comments: [], reactions: [] }} />);
  expect(screen.getByRole("link", { name: "Perfil de Ana" }).getAttribute("href")).toBe("/perfil/ana-dev");
  expect(screen.getByRole("link", { name: "Ana" }).getAttribute("href")).toBe("/perfil/ana-dev");
});
