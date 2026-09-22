// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const db = vi.hoisted(() => ({ count: vi.fn(), findMany: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { post: db } }));
import FeedLoading from "@/app/(social)/feed/loading";
import FeedError from "@/app/(social)/feed/error";
import { getFeedPage } from "@/lib/posts";
import { withTimeout } from "@/lib/with-timeout";

beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("loading do feed", () => {
  it("substitui loading por erro recuperável quando a navegação não termina", async () => {
    render(<FeedLoading />);
    expect(screen.getByRole("status").textContent).toContain("Carregando");
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("demorou");
    expect(screen.getByRole("link", { name: "Tentar novamente" }).getAttribute("href")).toBe("/feed");
  });
  it("limpa o timer ao concluir a navegação", () => {
    const view = render(<FeedLoading />);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("encerra a espera se o banco não responder", async () => {
    db.count.mockReturnValue(new Promise(() => {}));
    const result = expect(getFeedPage(1)).rejects.toThrow("tempo limite");
    await vi.advanceTimersByTimeAsync(10000);
    await result;
    expect(db.findMany).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("também limita uma listagem travada depois da contagem", async () => {
    db.count.mockResolvedValue(1);
    db.findMany.mockReturnValue(new Promise(() => {}));
    const result = expect(getFeedPage(1)).rejects.toThrow("tempo limite");
    await vi.advanceTimersByTimeAsync(10000);
    await result;
  });
  it("propaga erros ao error boundary e limpa o timeout no sucesso", async () => {
    db.count.mockRejectedValue(new Error("Banco indisponível"));
    await expect(getFeedPage(1)).rejects.toThrow("Banco indisponível");
    expect(vi.getTimerCount()).toBe(0);
    expect(await withTimeout(Promise.resolve("ok"), 10000, "timeout")).toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("permite tentar novamente sem submeter outro formulário", () => {
    const reset = vi.fn();
    render(<FeedError reset={reset} />);
    const button = screen.getByRole("button", { name: "Tentar novamente" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(reset).toHaveBeenCalledOnce();
  });
});
