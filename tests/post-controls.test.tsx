// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PostActionResult } from "@/lib/validation/post";

const mocks = vi.hoisted(() => ({
  remove: vi.fn(), update: vi.fn(), create: vi.fn(), refresh: vi.fn(), replace: vi.fn(),
  actions: new Map<string, (data: FormData) => Promise<void>>(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }) }));
vi.mock("@/app/feed/actions", () => ({ deletePostFromForm: mocks.remove, updatePostFromForm: mocks.update, createPostFromForm: mocks.create }));

// React 18 puro não contém o transporte de Server Actions do Next.js.
// O teste simula esse transporte, mantendo o DOM e os cliques reais no jsdom.
vi.mock("react-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-dom")>();
  const React = await import("react");
  return {
    ...original,
    useFormStatus: () => ({ pending: false }),
    useFormState: (action: (state: PostActionResult | null, data: FormData) => Promise<PostActionResult>, initial: null) => {
      const [state, setState] = React.useState<PostActionResult | null>(initial);
      const id = `/test-action/${React.useId()}`;
      mocks.actions.set(id, async (data) => { setState(await action(state, data)); });
      return [state, id];
    },
  };
});

import { PostCardShell } from "@/components/posts/post-card-shell";
import { PostForm } from "@/components/posts/post-form";

const post = { id: "post-1", content: "Conteúdo atual", codeSnippet: "const x = 1;", language: "javascript", isQuestion: true, highlightedCode: null };

function handleSubmit(event: Event) {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
  const data = new FormData(form);
  if (submitter?.name) data.set(submitter.name, submitter.value);
  const action = mocks.actions.get(form.getAttribute("action")!);
  if (action) void action(data);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.actions.clear();
  window.history.replaceState({}, "", "/feed");
  mocks.create.mockResolvedValue({ success: true });
  mocks.remove.mockResolvedValue({ success: true });
  mocks.update.mockImplementation(async (_state: unknown, data: FormData) => ({
    success: true,
    updatedPost: { id: data.get("postId"), content: data.get("content"), codeSnippet: data.get("codeSnippet") || null, language: data.get("codeSnippet") ? data.get("language") : null, isQuestion: data.get("isQuestion") === "on", highlightedCode: null },
  }));
  document.addEventListener("submit", handleSubmit);
});
afterEach(() => { cleanup(); document.removeEventListener("submit", handleSubmit); });

function setup() {
  render(<PostCardShell post={post} canEdit><span>Autor</span></PostCardShell>);
  return userEvent.setup();
}

describe("controles de posts", () => {
  it("publica sem adicionar os campos à URL nem iniciar outra navegação", async () => {
    render(<PostForm />);
    const before = window.location.href;
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Compartilhe com a comunidade"), "Post novo");
    await user.click(screen.getByText("Bloco de código (opcional)"));
    await user.type(screen.getByLabelText("Código"), "const x = 1;");
    await user.click(screen.getByRole("button", { name: "Publicar" }));
    await screen.findByRole("status");
    expect(mocks.create.mock.calls[0][1].get("content")).toBe("Post novo");
    expect(window.location.href).toBe(before);
    expect(window.location.search).toBe("");
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Compartilhe com a comunidade") as HTMLTextAreaElement).value).toBe("");
  });
  it("abre edição inline com texto, código, linguagem e dúvida atuais", async () => {
    const user = setup();
    const summary = screen.getByText("Editar");
    const details = summary.closest("details")!;
    expect(details.open).toBe(false);
    await user.click(summary);
    expect(details.open).toBe(true);
    expect((screen.getByLabelText("Editar publicação") as HTMLTextAreaElement).value).toBe(post.content);
    expect((screen.getByLabelText("Código") as HTMLTextAreaElement).value).toBe(post.codeSnippet);
    expect((screen.getByLabelText("Linguagem") as HTMLSelectElement).value).toBe(post.language);
    expect((screen.getByLabelText("É uma dúvida") as HTMLInputElement).checked).toBe(true);
  });
  it("cancela a edição sem salvar e restaura os campos", async () => {
    const user = setup();
    const details = screen.getByText("Editar").closest("details")!;
    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Editar publicação"));
    await user.type(screen.getByLabelText("Editar publicação"), "Rascunho");
    await user.click(within(details).getByRole("button", { name: "Cancelar" }));
    expect(details.open).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
    await user.click(screen.getByText("Editar"));
    expect((screen.getByLabelText("Editar publicação") as HTMLTextAreaElement).value).toBe(post.content);
  });
  it("envia a edição e fecha o formulário após sucesso", async () => {
    const user = setup();
    const before = window.location.href;
    const details = screen.getByText("Editar").closest("details")!;
    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Editar publicação"));
    await user.type(screen.getByLabelText("Editar publicação"), "Texto atualizado");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(details.open).toBe(false));
    expect(mocks.update.mock.calls[0][1].get("postId")).toBe(post.id);
    expect(mocks.update.mock.calls[0][1].get("content")).toBe("Texto atualizado");
    expect(screen.getByText("Texto atualizado", { selector: "p" })).toBeTruthy();
    expect(screen.queryByText(post.content, { selector: "p" })).toBeNull();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("pede confirmação e permite cancelar sem excluir", async () => {
    const user = setup();
    const details = screen.getByText("Excluir").closest("details")!;
    await user.click(screen.getByText("Excluir"));
    expect(details.open).toBe(true);
    expect(mocks.remove).not.toHaveBeenCalled();
    await user.click(within(details).getByRole("button", { name: "Cancelar" }));
    expect(details.open).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(screen.getByRole("article")).toBeTruthy();
  });
  it("confirma a exclusão e remove o card após sucesso", async () => {
    const user = setup();
    const before = window.location.href;
    await user.click(screen.getByText("Excluir"));
    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(screen.queryByRole("article")).toBeNull());
    expect(mocks.remove.mock.calls[0][1].get("postId")).toBe(post.id);
    expect(mocks.remove.mock.calls[0][1].get("confirmDelete")).toBe("yes");
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("mantém o card e mostra o erro quando a exclusão falha", async () => {
    mocks.remove.mockResolvedValue({ success: false, error: "Sem permissão para excluir." });
    const user = setup();
    await user.click(screen.getByText("Excluir"));
    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Sem permissão para excluir.");
    expect(screen.getByRole("article")).toBeTruthy();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("não oferece controles nos posts de outro autor", () => {
    render(<PostCardShell post={post} canEdit={false}><span>Outra pessoa</span></PostCardShell>);
    expect(screen.queryByText("Editar")).toBeNull();
    expect(screen.queryByText("Excluir")).toBeNull();
  });
  it("atualiza código, linguagem e dúvida sem depender do refresh", async () => {
    const user = setup();
    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Código"));
    await user.type(screen.getByLabelText("Código"), "print(2)");
    await user.selectOptions(screen.getByLabelText("Linguagem"), "python");
    await user.click(screen.getByLabelText("É uma dúvida"));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(screen.getByText("print(2)", { selector: "code" })).toBeTruthy());
    expect(screen.getByText("Python", { selector: "div" })).toBeTruthy();
    expect(screen.queryByText("Dúvida", { selector: "span" })).toBeNull();
    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Código"));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(document.querySelector("pre")).toBeNull());
  });
  it("não altera o conteúdo visível quando salvar falha", async () => {
    mocks.update.mockResolvedValue({ success: false, error: "Não foi possível editar." });
    const user = setup();
    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Editar publicação"));
    await user.type(screen.getByLabelText("Editar publicação"), "Não foi salvo");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await screen.findByRole("alert");
    expect(screen.getByText(post.content, { selector: "p" })).toBeTruthy();
    expect(screen.queryByText("Não foi salvo", { selector: "p" })).toBeNull();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("mantém a edição durante resposta antiga e sincroniza quando o servidor confirma", async () => {
    const view = render(<PostCardShell post={post} canEdit><span>Autor</span></PostCardShell>);
    const user = userEvent.setup();
    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Editar publicação"));
    await user.type(screen.getByLabelText("Editar publicação"), "Texto salvo");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await screen.findByText("Texto salvo", { selector: "p" });
    view.rerender(<PostCardShell post={{ ...post }} canEdit><span>Autor</span></PostCardShell>);
    expect(screen.getByText("Texto salvo", { selector: "p" })).toBeTruthy();
    view.rerender(<PostCardShell post={{ ...post, content: "Texto salvo" }} canEdit><span>Autor</span></PostCardShell>);
    view.rerender(<PostCardShell post={{ ...post, content: "Nova versão do servidor" }} canEdit><span>Autor</span></PostCardShell>);
    expect(screen.getByText("Nova versão do servidor", { selector: "p" })).toBeTruthy();
  });
  it("remove apenas o post excluído de uma lista antes do refresh terminar", async () => {
    const second = { ...post, id: "post-2", content: "Outro post" };
    const cards = () => <>{[post, second].map(item => <PostCardShell key={item.id} post={{ ...item }} canEdit><span>Autor</span></PostCardShell>)}</>;
    const view = render(cards());
    const user = userEvent.setup();
    const firstCard = screen.getAllByRole("article")[0];
    await user.click(within(firstCard).getByText("Excluir"));
    await user.click(within(firstCard).getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
    expect(screen.getByText("Outro post", { selector: "p" })).toBeTruthy();
    view.rerender(cards());
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByText(post.content, { selector: "p" })).toBeNull();
  });
});
