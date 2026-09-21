// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), signOut: vi.fn(), replace: vi.fn(), refresh: vi.fn(), fetch: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn: mocks.signIn, signOut: mocks.signOut }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
import { AuthForm } from "@/components/auth-form";
import { SignOutButton } from "@/components/sign-out-button";

beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", mocks.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("envios de autenticação", () => {
  it("registro impede submit nativo e envia JSON por POST sem dados na URL", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ message: "ok" }) });
    render(<AuthForm mode="registro" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("Username"), "ana");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Senha"), "senha-segura");
    const form = screen.getByRole("button", { name: "Criar conta" }).closest("form")!;
    expect(form.method).toBe("post");
    const event = new Event("submit", { bubbles: true, cancelable: true });
    fireEvent(form, event);
    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login?registered=1"));
    expect(mocks.fetch.mock.calls[0][0]).toBe("/api/registro");
    expect(mocks.fetch.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ name: "Ana", username: "ana", email: "ana@example.com", password: "senha-segura" }) });
    expect(window.location.search).toBe("");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("login impede GET e usa o Credentials Provider sem redirect nativo", async () => {
    mocks.signIn.mockResolvedValue({ ok: true });
    render(<AuthForm mode="login" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Senha"), "senha-segura");
    const form = screen.getByRole("button", { name: "Entrar" }).closest("form")!;
    expect(form.method).toBe("post");
    const event = new Event("submit", { bubbles: true, cancelable: true });
    fireEvent(form, event);
    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/feed"));
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ redirect: false, email: "ana@example.com", password: "senha-segura" }));
    expect(window.location.search).toBe("");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("libera o formulário e exibe erro quando a conexão falha", async () => {
    mocks.signIn.mockRejectedValue(new Error("offline"));
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-segura" } });
    fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form")!);
    await screen.findByRole("alert");
    expect((screen.getByRole("button", { name: "Entrar" }).closest("fieldset") as HTMLFieldSetElement).disabled).toBe(false);
  });
  it("não mantém o login ocupado indefinidamente", async () => {
    vi.useFakeTimers();
    mocks.signIn.mockReturnValue(new Promise(() => {}));
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-segura" } });
    fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form")!);
    expect(screen.getByRole("button", { name: "Aguarde…" })).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
  });
  it("sair não submete um formulário e trata falha do logout", async () => {
    mocks.signOut.mockRejectedValue(new Error("offline"));
    render(<SignOutButton />);
    const button = screen.getByRole("button", { name: "Sair" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    await screen.findByRole("alert");
    expect(mocks.signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });
});
