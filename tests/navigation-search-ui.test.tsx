// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ pathname: "/feed", fetch: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/components/profile-follow", () => ({ ProfileFollow: ({ initialSummary }: { initialSummary: { following: boolean } }) => <button type="button">{initialSummary.following ? "Deixar de seguir" : "Seguir"}</button> }));
import { AppNavbar } from "@/components/app-navbar";
import { UserSearch } from "@/components/user-search";
beforeEach(() => { vi.resetAllMocks(); mocks.pathname = "/feed"; vi.stubGlobal("fetch", mocks.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const person = { id: "other", name: "Matheus", username: "matheus", avatarUrl: null, isFollowing: false, followers: 1, following: 2 };
const response = (users: unknown[]) => ({ ok: true, json: async () => ({ users }) });

it("navbar tem quatro links e destaca a seção atual e subrotas do perfil próprio", () => {
  const view = render(<AppNavbar username="ana" />);
  expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/feed", "/buscar", "/chats", "/perfil/ana"]);
  expect(screen.getByRole("link", { name: "Feed" }).getAttribute("aria-current")).toBe("page");
  for (const [path, label] of [["/buscar", "Busca"], ["/chats", "Chats"], ["/perfil/ana/seguindo", "Perfil"]]) {
    mocks.pathname = path; view.rerender(<AppNavbar username="ana" />);
    expect(screen.getByRole("link", { name: label }).getAttribute("aria-current")).toBe("page");
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  }
  mocks.pathname = "/perfil/other"; view.rerender(<AppNavbar username="ana" />);
  expect(screen.getByRole("link", { name: "Perfil" }).getAttribute("aria-current")).toBeNull();
});
it("aguarda 300 ms após a última tecla, lista dados e não submete formulário", async () => {
  vi.useFakeTimers(); mocks.fetch.mockResolvedValue(response([person]));
  render(<UserSearch viewerId="viewer" />);
  expect(screen.getByText("Digite um @username ou nome para buscar.")).toBeTruthy();
  const input = screen.getByRole("searchbox");
  fireEvent.change(input, { target: { value: "ma" } });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  fireEvent.change(input, { target: { value: "mat" } });
  await act(async () => { await vi.advanceTimersByTimeAsync(299); });
  expect(mocks.fetch).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(mocks.fetch).toHaveBeenCalledOnce();
  expect(mocks.fetch.mock.calls[0][0]).toBe("/api/usuarios?q=mat");
  expect(screen.getByRole("link").getAttribute("href")).toBe("/perfil/matheus");
  expect(screen.getByRole("button", { name: "Seguir" })).toBeTruthy();
  expect(document.querySelector("form")).toBeNull();
});
it("ignora resposta antiga, cancela requisição e limpa ao apagar", async () => {
  vi.useFakeTimers();
  let resolveOld!: (value: unknown) => void;
  mocks.fetch.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(response([]));
  render(<UserSearch viewerId="viewer" />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "old" } });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  const signal = mocks.fetch.mock.calls[0][1].signal;
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "new" } });
  expect(signal.aborted).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(screen.getByText("Nenhum usuário encontrado")).toBeTruthy();
  await act(async () => { resolveOld(response([person])); });
  expect(screen.queryByText("Matheus")).toBeNull();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
  expect(screen.getByText("Digite um @username ou nome para buscar.")).toBeTruthy();
});
it("trata erro e permite nova tentativa; não permite seguir a si mesmo", async () => {
  vi.useFakeTimers(); mocks.fetch.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response([{ ...person, id: "viewer" }]));
  render(<UserSearch viewerId="viewer" />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "mat" } });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(screen.getByText("Matheus")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
