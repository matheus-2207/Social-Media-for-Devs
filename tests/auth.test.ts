import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare, hash } from "bcrypt";
import { Prisma } from "@prisma/client";
import type { CredentialsConfig } from "next-auth/providers/credentials";

const db = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: db } }));

import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { authOptions } from "@/lib/auth";
import { POST } from "@/app/api/registro/route";

const credentials = { username: "ana", name: "  Ana  ", email: "  ANA@example.com  ", password: "senha-segura-123" };
const authorize = (authOptions.providers[0] as CredentialsConfig).options!.authorize!;
const requestContext = {} as Parameters<typeof authorize>[1];
const request = (body: unknown) => new Request("http://localhost/api/registro", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => vi.resetAllMocks());

describe("validação", () => {
  it("normaliza nome e email sem alterar a senha", () => {
    expect(registerSchema.parse(credentials)).toEqual({ ...credentials, name: "Ana", email: "ana@example.com" });
  });
  it.each([
    { ...credentials, name: "  " },
    { ...credentials, email: "invalido" },
    { ...credentials, password: "" },
    { ...credentials, password: "curta" },
    { ...credentials, password: "🔑".repeat(19) },
  ])("rejeita formulário inválido", (input) => {
    expect(registerSchema.safeParse(input).success).toBe(false);
  });
  it("exige email e senha no login", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
  });
  it("normaliza username e rejeita caracteres inválidos", () => {
    expect(registerSchema.parse({ ...credentials, username: "  Ana_Dev  " }).username).toBe("ana_dev");
    for (const username of ["", "ab", "ana/dev", "ana dev", "a".repeat(31)]) expect(registerSchema.safeParse({ ...credentials, username }).success).toBe(false);
  });
});

describe("registro", () => {
  it("persiste apenas o hash bcrypt e não o devolve ao cliente", async () => {
    db.create.mockResolvedValue({ id: "user-1" });
    const response = await POST(request(credentials));
    expect(response.status).toBe(201);
    const { data } = db.create.mock.calls[0][0];
    expect(data).toMatchObject({ name: "Ana", email: "ana@example.com" });
    expect(data).not.toHaveProperty("password");
    expect(data.passwordHash).toMatch(/^\$2[ab]\$12\$/);
    expect(await compare(credentials.password, data.passwordHash)).toBe(true);
    expect(await response.json()).toEqual({ message: "Conta criada com sucesso." });
  });
  it("rejeita dados inválidos antes de acessar o banco", async () => {
    expect((await POST(request({ ...credentials, email: "inválido" }))).status).toBe(400);
    expect(db.create).not.toHaveBeenCalled();
  });
  it("rejeita JSON malformado", async () => {
    const response = await POST(new Request("http://localhost/api/registro", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });
  it("trata email duplicado, inclusive em registros concorrentes", async () => {
    db.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6.19.3" }));
    expect((await POST(request(credentials))).status).toBe(409);
  });
  it("não expõe detalhes do banco em falhas", async () => {
    db.create.mockRejectedValue(new Error("detalhe-privado"));
    const response = await POST(request(credentials));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("detalhe-privado");
  });
  it("trata username duplicado sem alterar o erro de email", async () => {
    db.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6", meta: { target: ["username"] } }));
    const response = await POST(request(credentials));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Este username já está em uso. Escolha outro." });
  });
});

describe("Credentials Provider", () => {
  it("autentica com bcrypt e retorna somente dados públicos", async () => {
    db.findUnique.mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@example.com", avatarUrl: null, passwordHash: await hash(credentials.password, 12) });
    expect(await authorize(credentials, requestContext)).toEqual({ id: "user-1", name: "Ana", email: "ana@example.com", image: null });
    expect(db.findUnique.mock.calls[0][0].where).toEqual({ email: "ana@example.com" });
  });
  it("rejeita senha incorreta", async () => {
    db.findUnique.mockResolvedValue({ passwordHash: await hash("outra-senha", 12) });
    expect(await authorize(credentials, requestContext)).toBeNull();
  });
  it("rejeita usuário inexistente", async () => {
    db.findUnique.mockResolvedValue(null);
    expect(await authorize(credentials, requestContext)).toBeNull();
  });
  it("rejeita credenciais ausentes antes de consultar o banco", async () => {
    expect(await authorize(undefined, requestContext)).toBeNull();
    expect(db.findUnique).not.toHaveBeenCalled();
  });
  it("não expõe erros internos do banco no login", async () => {
    db.findUnique.mockRejectedValue(new Error("detalhe-privado"));
    await expect(authorize(credentials, requestContext)).rejects.toThrow("Não foi possível entrar. Tente novamente mais tarde.");
  });
});
