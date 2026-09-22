// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mocks = vi.hoisted(() => ({ push: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => new URLSearchParams(mocks.query) }));
import { FeedFilters } from "@/components/posts/feed-filters";
beforeEach(() => { vi.clearAllMocks(); mocks.query = ""; });
afterEach(cleanup);
const view = () => <FeedFilters languages={["javascript", "custom-lang", "python"]} questionCount={7} />;

it.each([ ["cpp", "C++", "cpp"], ["C++", "C++", "C%2B%2B"], ["Custom+Lang", "Custom+Lang", "Custom%2BLang"] ])("preserva o rótulo de %s e codifica apenas a URL", async (value, label, encoded) => {
  mocks.query = `tech=${encoded}&type=question`;
  render(<FeedFilters languages={[value]} questionCount={2} />);
  expect(screen.getByRole("option", { name: label }).getAttribute("value")).toBe(value);
  expect(screen.getByRole("status").textContent).toBe(`Dúvidas · ${label}`);
  await userEvent.setup().click(screen.getByRole("button", { name: "Todos" }));
  expect(mocks.push).toHaveBeenCalledWith(`/feed?tech=${encoded}`, { scroll: false });
});

it("mantém C++ legível quando a linguagem deixa de ter publicações", () => {
  mocks.query = "tech=cpp";
  render(<FeedFilters languages={[]} questionCount={0} />);
  expect(screen.getByRole("option", { name: "C++ (sem publicações)" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe("Todos os posts · C++");
});

it("começa em Todos e renderiza apenas as linguagens recebidas do banco", () => {
  render(view());
  expect(screen.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getAllByRole("option").map(item => item.getAttribute("value"))).toEqual(["", "javascript", "custom-lang", "python"]);
  expect(document.querySelector("form")).toBeNull();
});
it("combina dúvidas com linguagem e reinicia na primeira página via router.push", async () => {
  mocks.query = "tech=javascript&page=4";
  render(view());
  await userEvent.setup().click(screen.getByRole("button", { name: "Dúvidas (7)" }));
  expect(mocks.push).toHaveBeenCalledWith("/feed?tech=javascript&type=question", { scroll: false });
});
it("troca tecnologia preservando a aba e usa navegação do Next", async () => {
  mocks.query = "tech=javascript&type=question&page=3";
  render(view());
  await userEvent.setup().selectOptions(screen.getByLabelText("Tecnologia / linguagem"), "python");
  expect(mocks.push).toHaveBeenCalledWith("/feed?tech=python&type=question", { scroll: false });
  expect(screen.getByRole("button", { name: "Dúvidas (7)" }).getAttribute("aria-pressed")).toBe("true");
});
it("Todos remove apenas o tipo; limpar filtros remove ambos", async () => {
  mocks.query = "tech=python&type=question&page=2";
  render(view());
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Todos" }));
  expect(mocks.push).toHaveBeenLastCalledWith("/feed?tech=python", { scroll: false });
  await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(mocks.push).toHaveBeenLastCalledWith("/feed", { scroll: false });
});
it("restaura seleção ao voltar/avançar e mantém filtro sem resultados visível", () => {
  const component = render(view());
  mocks.query = "tech=removed-language&type=question";
  component.rerender(view());
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("removed-language");
  expect(screen.getByRole("status").textContent).toBe("Dúvidas · removed-language");
  mocks.query = "";
  component.rerender(view());
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("");
  expect(screen.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed")).toBe("true");
});
