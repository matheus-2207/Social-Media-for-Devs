import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { JSDOM } from "jsdom";

// Exercita o HTML/POST reais do Next, sem mocks de useFormState e sem tocar no banco.
// Não copia .env nem cria a rota de teste no app do usuário.
const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "social-media-post-forms-"));
for (const item of ["app", "components", "lib", "types", "prisma", "package.json", "package-lock.json", "tsconfig.json", "next.config.mjs", "next-env.d.ts", "postcss.config.mjs", "tailwind.config.ts", ".eslintrc.json", "middleware.ts"]) {
  fs.cpSync(path.join(root, item), path.join(temp, item), { recursive: true });
}
fs.symlinkSync(path.join(root, "node_modules"), path.join(temp, "node_modules"), "dir");
fs.mkdirSync(path.join(temp, "app/form-check"));
fs.copyFileSync(path.join(root, "tests/fixtures/post-forms.tsx"), path.join(temp, "app/form-check/page.tsx"));
const next = path.join(root, "node_modules/next/dist/bin/next");
const env = { ...process.env, NODE_ENV: "production", NEXTAUTH_SECRET: "integration-only-secret-not-for-real-sessions", NEXT_TELEMETRY_DISABLED: "1" };
delete env.DATABASE_URL;
delete env.DIRECT_URL;
console.log("Projeto isolado:", temp);

const build = spawn(process.execPath, [next, "build"], { cwd: temp, env, stdio: "inherit" });
const [buildCode] = await once(build, "exit");
assert.equal(buildCode, 0, "O build do projeto de teste deve passar.");

const probe = createServer();
probe.listen(0, "127.0.0.1");
await once(probe, "listening");
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: temp, env: { ...env, NEXTAUTH_URL: base }, stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", data => process.stdout.write(data));
server.stderr.on("data", data => process.stderr.write(data));

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Servidor não iniciou em 15 segundos.")), 15000);
    server.stdout.on("data", data => { if (data.toString().includes("Ready")) { clearTimeout(timer); resolve(); } });
    server.once("exit", () => { clearTimeout(timer); reject(new Error("Servidor encerrou antes dos testes.")); });
  });

  const pageUrl = `${base}/form-check`;
  const response = await fetch(pageUrl, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200);
  const document = new JSDOM(await response.text(), { url: pageUrl }).window.document;

  for (const script of document.querySelectorAll("script[src]")) {
    const response = await fetch(new URL(script.getAttribute("src"), base), { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, `JavaScript indisponível: ${script.getAttribute("src")}`);
    assert.match(response.headers.get("content-type"), /javascript/);
  }

  const cases = [
    ["criação", "#create form", "Entre na sua conta para publicar."],
    ["edição", "#existing details:first-of-type form", "Entre na sua conta para editar."],
    ["exclusão", "#existing details:nth-of-type(2) form", "Entre na sua conta para excluir."],
    ["comentário", "[data-comment-create]", "Entre na sua conta para comentar."],
    ["excluir comentário", "[data-comment-delete]", "Entre na sua conta para excluir o comentário."],
    ["reação", "[data-reactions]", "Entre na sua conta para reagir."],
    ["seguir", "[data-follow]", "Entre na sua conta para seguir pessoas."],
  ];
  for (const [name, selector, expectedError] of cases) {
    console.log(`Verificando ${name}…`);
    const form = document.querySelector(selector);
    assert.ok(form, `Formulário de ${name} deve existir.`);
    assert.equal(form.method, "post", `${name}: nunca usar GET, mesmo antes da hidratação.`);
    const actionUrl = new URL(form.getAttribute("action") || pageUrl, pageUrl);
    assert.equal(actionUrl.search, "", `${name}: sem dados na URL.`);
    const data = new FormData();
    for (const field of form.querySelectorAll('input[type="hidden"]')) data.append(field.name, field.value);
    assert.ok([...data.keys()].some(key => key.startsWith("$ACTION_")), `${name}: Server Action real deve estar registrada.`);
    if (name === "exclusão") data.set("confirmDelete", "yes");
    else if (name === "reação") data.set("type", "FUNCIONA");
    else if (name === "seguir") data.set("intent", "follow");
    else {
      data.set("content", "Texto que jamais deve aparecer na URL");
      data.set("codeSnippet", "const value = 1;");
      data.set("language", "javascript");
      data.set("isQuestion", "on");
    }
    const result = await fetch(actionUrl, { method: "POST", body: data, headers: { Origin: base }, redirect: "manual", signal: AbortSignal.timeout(15000) });
    console.log(`${name}: resposta HTTP ${result.status}`);
    assert.equal(result.status, 200, `${name}: resposta do POST deve ser tratada.`);
    assert.equal(new URL(result.url).search, "", `${name}: URL permanece sem query params.`);
    assert.equal(result.headers.get("location"), null, `${name}: não deve navegar com dados do formulário.`);
    const resultHtml = await result.text();
    assert.ok(resultHtml.includes(expectedError), `${name}: a Server Action deve retornar o erro de sessão esperado, sem mutação no banco.`);
    console.log(`✓ ${name}: POST real, ação executada, URL sem query params e erro tratado.`);
  }
  for (const id of ["login", "register"]) {
    const form = document.querySelector(`#${id} form`);
    assert.equal(form.method, "post");
    assert.ok(form.querySelector("fieldset").disabled, `${id}: impedir envio antes de ativar o handler.`);
  }
  assert.equal(document.querySelector("button:not([type])"), null, "Todos os botões devem declarar seu tipo.");
  console.log("✓ Login/registro protegidos antes da hidratação; botões com tipo explícito; nenhum chunk JavaScript com 404.");
} finally {
  const stopped = once(server, "exit");
  server.kill("SIGTERM");
  await stopped;
}
