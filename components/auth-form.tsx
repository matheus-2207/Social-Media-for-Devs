"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { useHydrated } from "@/lib/use-hydrated";
import { withTimeout } from "@/lib/with-timeout";

export function AuthForm({ mode, registered = false }: { mode: "login" | "registro"; registered?: boolean }) {
  const isRegister = mode === "registro";
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || pending) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const values = { name: form.get("name"), username: form.get("username"), email: form.get("email"), password: form.get("password") };
    const result = (isRegister ? registerSchema : loginSchema).safeParse(values);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setPending(true);
    try {
      if (isRegister) {
        const response = await fetch("/api/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.data),
          signal: AbortSignal.timeout(15000),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Não foi possível criar sua conta.");
          return;
        }
        router.replace("/login?registered=1");
      } else {
        const response = await withTimeout(signIn("credentials", {
          email: result.data.email,
          password: result.data.password,
          redirect: false,
          callbackUrl: "/feed",
        }), 15000, "O login demorou para responder.");
        if (!response?.ok || response.error) {
          setError("Não foi possível entrar. Confira seu email e senha e tente novamente.");
          return;
        }
        router.replace("/feed");
      }
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  const inputClass = "input-control mt-2 w-full";

  return (
    <section className="w-full max-w-md rounded-lg border border-line bg-surface p-7 text-ink sm:p-9">
      <p className="mb-6 text-sm font-semibold text-accent">Social Media for Devs</p>
      <h1 className="page-title">{isRegister ? "Crie sua conta" : "Entre na sua conta"}</h1>
      <p className="mt-2 text-sm text-muted">{isRegister ? "Seu próximo encontro com a comunidade começa aqui." : "Conecte-se à comunidade de desenvolvedores."}</p>
      {registered && <p role="status" className="mt-5 rounded-lg bg-accent-soft p-3 text-sm text-accent">Conta criada! Entre com seu email e senha.</p>}
      <form method="post" action={isRegister ? "/api/registro" : "/api/auth/callback/credentials"} className="mt-6 space-y-5" onSubmit={handleSubmit} aria-busy={pending}>
        <fieldset disabled={!hydrated || pending} className="space-y-5 disabled:opacity-70">
          {isRegister && <div>
            <label htmlFor="name" className="text-sm font-medium">Nome</label>
            <input id="name" name="name" type="text" autoComplete="name" required maxLength={100} className={inputClass} />
          </div>}
          {isRegister && <div>
            <label htmlFor="username" className="text-sm font-medium">Username</label>
            <input id="username" name="username" autoComplete="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9][a-zA-Z0-9_\-]*" className={inputClass} aria-describedby="username-help" />
            <p id="username-help" className="mt-2 text-xs text-subtle">Seu identificador público: letras, números, hífen ou sublinhado.</p>
          </div>}
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Senha</label>
            <input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 8 : 1} maxLength={72} aria-describedby={isRegister ? "password-help" : undefined} className={inputClass} />
            {isRegister && <p id="password-help" className="mt-2 text-xs text-subtle">Use pelo menos 8 caracteres e no máximo 72 bytes.</p>}
          </div>
          {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait">
            {pending ? "Aguarde…" : isRegister ? "Criar conta" : "Entrar"}
          </button>
        </fieldset>
      </form>
      <noscript><p className="mt-4 text-sm text-danger">Ative o JavaScript para entrar ou criar sua conta.</p></noscript>
      <p className="mt-6 text-center text-sm text-muted">
        {isRegister ? "Já tem uma conta? " : "Ainda não tem conta? "}
        <Link href={isRegister ? "/login" : "/registro"} className="font-semibold text-accent hover:underline">{isRegister ? "Entrar" : "Cadastre-se"}</Link>
      </p>
    </section>
  );
}
