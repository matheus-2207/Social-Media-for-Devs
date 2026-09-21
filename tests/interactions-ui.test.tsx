// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommentResult, CommentView, ReactionResult } from "@/lib/interactions";
import type { FollowResult } from "@/lib/follow";

const mocks = vi.hoisted(() => ({ follow: vi.fn(), create: vi.fn(), remove: vi.fn(), react: vi.fn(), actions: new Map<string, (data: FormData) => Promise<void>>() }));
vi.mock("@/app/perfil/actions", () => ({ setFollow: mocks.follow }));
vi.mock("@/app/feed/interaction-actions", () => ({ createComment: mocks.create, deleteComment: mocks.remove, toggleReaction: mocks.react }));
// Simula apenas o transporte ausente no React 18 puro. O teste HTTP cobre o Next real.
vi.mock("react-dom", async importOriginal => {
  const original = await importOriginal<typeof import("react-dom")>();
  const React = await import("react");
  type Result = CommentResult | ReactionResult | FollowResult;
  return { ...original, useFormStatus: () => ({ pending: false }), useFormState: (action: (state: Result | null, data: FormData) => Promise<Result>, initial: null) => {
    const [state, setState] = React.useState<Result | null>(initial);
    const id = `/action/${React.useId()}`;
    mocks.actions.set(id, async data => { setState(await action(state, data)); });
    return [state, id];
  } };
});
import { CommentList } from "@/components/posts/comment-list";
import { ReactionBar } from "@/components/posts/reaction-bar";
import { ProfileFollow } from "@/components/profile-follow";

const comment: CommentView = { id: "c1", postId: "p1", authorId: "u1", content: "Primeiro comentário", createdAt: "2026-09-21T12:00:00.000Z", author: { name: "Dev", avatarUrl: null } };
const other = { ...comment, id: "c2", authorId: "u2", content: "Segundo comentário", createdAt: "2026-09-21T13:00:00.000Z" };
function submit(event: Event) {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const data = new FormData(form);
  const button = (event as SubmitEvent).submitter as HTMLButtonElement | null;
  if (button?.name) data.set(button.name, button.value);
  const action = mocks.actions.get(form.getAttribute("action")!);
  if (action) void action(data);
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.actions.clear();
  window.history.replaceState({}, "", "/feed");
  document.addEventListener("submit", submit);
});
afterEach(() => { cleanup(); document.removeEventListener("submit", submit); });

it("segue e deixa de seguir atualizando botão e contagem sem navegar", async () => {
  mocks.follow.mockResolvedValueOnce({ success: true, summary: { following: true, followers: 3 } }).mockResolvedValueOnce({ success: true, summary: { following: false, followers: 2 } });
  render(<ProfileFollow userId="target" canFollow initialSummary={{ following: false, followers: 2 }} followingCount={7} />);
  const user = userEvent.setup(); const url = window.location.href;
  await user.click(screen.getByRole("button", { name: "Seguir" }));
  await screen.findByRole("button", { name: "Deixar de seguir" });
  expect(screen.getByText("3", { selector: "strong" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Deixar de seguir" }));
  await screen.findByRole("button", { name: "Seguir" });
  expect(screen.getByText("2", { selector: "strong" })).toBeTruthy();
  expect(mocks.follow.mock.calls.map(call => call[1].get("intent"))).toEqual(["follow", "unfollow"]);
  expect(window.location.href).toBe(url);
});
it("não oferece seguir sem permissão e mantém estado após erro", async () => {
  const view = render(<ProfileFollow userId="target" canFollow={false} initialSummary={{ following: false, followers: 2 }} followingCount={7} />);
  expect(screen.queryByRole("button")).toBeNull();
  view.rerender(<ProfileFollow userId="target" canFollow initialSummary={{ following: false, followers: 2 }} followingCount={7} />);
  mocks.follow.mockResolvedValue({ success: false, error: "Tente novamente" });
  await userEvent.setup().click(screen.getByRole("button", { name: "Seguir" }));
  await screen.findByRole("alert");
  expect(screen.getByText("2", { selector: "strong" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Seguir" })).toBeTruthy();
});
it("visitantes leem comentários e reações sem formulários de mutação", () => {
  render(<><CommentList postId="p1" currentUserId={null} initialComments={[comment]} /><ReactionBar postId="p1" readOnly initialSummary={{ counts: { FUNCIONA: 1, CLEAN_CODE: 0, DUVIDOSO: 0 }, selected: null }} /></>);
  expect(screen.getByText(comment.content)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Entre para comentar ou reagir" }).getAttribute("href")).toBe("/login");
  expect(document.querySelector("form")).toBeNull();
});

it("ordena comentários e oferece exclusão apenas ao autor", () => {
  render(<CommentList postId="p1" currentUserId="u1" initialComments={[other, comment]} />);
  expect(screen.getAllByRole("listitem").map(item => item.querySelector("p")?.textContent)).toEqual([comment.content, other.content]);
  expect(screen.getAllByRole("button", { name: "Excluir comentário" })).toHaveLength(1);
});
it("adiciona texto seguro, limpa o campo e exclui localmente sem alterar a URL", async () => {
  const added = { ...comment, id: "c3", content: "<script>test</script>" };
  mocks.create.mockResolvedValue({ success: true, comment: added });
  mocks.remove.mockResolvedValue({ success: true, deletedCommentId: "c3" });
  const view = render(<CommentList postId="p1" currentUserId="u1" initialComments={[]} />);
  const user = userEvent.setup();
  const url = window.location.href;
  await user.type(screen.getByLabelText("Adicionar comentário"), added.content);
  await user.click(screen.getByRole("button", { name: "Comentar" }));
  await screen.findByText(added.content);
  expect(document.querySelector("script")).toBeNull();
  expect((screen.getByLabelText("Adicionar comentário") as HTMLTextAreaElement).value).toBe("");
  expect(mocks.create.mock.calls[0][1].get("postId")).toBe("p1");
  view.rerender(<CommentList postId="p1" currentUserId="u1" initialComments={[added]} />);
  expect(screen.getAllByText(added.content)).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Excluir comentário" }));
  await waitFor(() => expect(screen.queryByText(added.content)).toBeNull());
  expect(mocks.remove.mock.calls[0][1].get("commentId")).toBe("c3");
  expect(window.location.href).toBe(url);
  expect(window.location.search).toBe("");
});
it("mantém rascunho/comentário e mostra os erros tratados", async () => {
  mocks.create.mockResolvedValue({ success: false, error: "Falha ao comentar" });
  mocks.remove.mockResolvedValue({ success: false, error: "Falha ao excluir" });
  render(<CommentList postId="p1" currentUserId="u1" initialComments={[comment]} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Adicionar comentário"), "Rascunho");
  await user.click(screen.getByRole("button", { name: "Comentar" }));
  await screen.findByText("Falha ao comentar");
  expect((screen.getByLabelText("Adicionar comentário") as HTMLTextAreaElement).value).toBe("Rascunho");
  await user.click(screen.getByRole("button", { name: "Excluir comentário" }));
  await screen.findByText("Falha ao excluir");
  expect(screen.getByText(comment.content)).toBeTruthy();
  expect(window.location.search).toBe("");
});
it("atualiza contagem e destaque ao adicionar, trocar e remover, sem navegação", async () => {
  const empty = { counts: { FUNCIONA: 0, CLEAN_CODE: 0, DUVIDOSO: 0 }, selected: null };
  mocks.react.mockResolvedValueOnce({ success: true, summary: { counts: { ...empty.counts, FUNCIONA: 1 }, selected: "FUNCIONA" } })
    .mockResolvedValueOnce({ success: true, summary: { counts: { ...empty.counts, CLEAN_CODE: 1 }, selected: "CLEAN_CODE" } })
    .mockResolvedValueOnce({ success: true, summary: empty });
  render(<ReactionBar postId="p1" initialSummary={empty} />);
  const user = userEvent.setup();
  const url = window.location.href;
  await user.click(screen.getByRole("button", { name: "Funciona: 0" }));
  expect((await screen.findByRole("button", { name: "Funciona: 1" })).getAttribute("aria-pressed")).toBe("true");
  await user.click(screen.getByRole("button", { name: "Clean code: 0" }));
  expect((await screen.findByRole("button", { name: "Clean code: 1" })).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "Funciona: 0" }).getAttribute("aria-pressed")).toBe("false");
  await user.click(screen.getByRole("button", { name: "Clean code: 1" }));
  expect((await screen.findByRole("button", { name: "Clean code: 0" })).getAttribute("aria-pressed")).toBe("false");
  expect(mocks.react.mock.calls.map(call => call[1].get("type"))).toEqual(["FUNCIONA", "CLEAN_CODE", "CLEAN_CODE"]);
  expect(window.location.href).toBe(url);
});
it("preserva a reação quando a ação falha e permite tentar novamente", async () => {
  mocks.react.mockResolvedValue({ success: false, error: "Tente novamente" });
  render(<ReactionBar postId="p1" initialSummary={{ counts: { FUNCIONA: 0, CLEAN_CODE: 0, DUVIDOSO: 1 }, selected: "DUVIDOSO" }} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Funciona: 0" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Tente novamente");
  expect(screen.getByRole("button", { name: "Duvidoso: 1" }).getAttribute("aria-pressed")).toBe("true");
  expect((screen.getByRole("button", { name: "Funciona: 0" }) as HTMLButtonElement).disabled).toBe(false);
  expect(window.location.search).toBe("");
});
