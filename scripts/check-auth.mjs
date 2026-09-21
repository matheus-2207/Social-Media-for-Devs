import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { encode } from "next-auth/jwt";

nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
assert.ok(process.env.NEXTAUTH_SECRET, "Configure NEXTAUTH_SECRET antes do teste.");

for (const path of ["/login", "/registro"]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /type="email"/);
  assert.match(html, /required/);
  console.log(`${path}: formulário disponível`);
}

for (const path of ["/feed", "/feed/privado"]) {
  const response = await fetch(base + path, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), base).pathname, "/login");
  console.log(`${path}: acesso anônimo bloqueado`);
}

const invalid = await fetch(base + "/api/registro", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "", email: "invalido", password: "" }),
});
assert.equal(invalid.status, 400);

// Token temporário apenas para verificar sessão/middleware sem criar dados no banco.
const token = await encode({
  secret: process.env.NEXTAUTH_SECRET,
  token: { sub: "smoke-test", name: "Teste de sessão", email: "teste@example.com" },
  maxAge: 60,
});
const headers = { cookie: `next-auth.session-token=${token}` };
const feed = await fetch(base + "/feed", { headers, redirect: "manual" });
assert.equal(feed.status, 200);
assert.match(await feed.text(), /Teste de sessão/);
for (const path of ["/login", "/registro"]) {
  const response = await fetch(base + path, { headers, redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), base).pathname, "/feed");
}
const session = await (await fetch(base + "/api/auth/session", { headers })).json();
assert.equal(session.user.id, "smoke-test");
assert.equal("passwordHash" in session.user, false);
const tampered = await fetch(base + "/feed", {
  headers: { cookie: "next-auth.session-token=invalid" },
  redirect: "manual",
});
assert.equal(tampered.status, 307);
console.log("Sessão e redirecionamentos válidos; token adulterado rejeitado.");
