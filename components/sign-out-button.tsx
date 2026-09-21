"use client";

import { signOut } from "next-auth/react";
import { useState, type MouseEvent } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { withTimeout } from "@/lib/with-timeout";

export function SignOutButton() {
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!hydrated || pending) return;
    setPending(true);
    setError("");
    try {
      await withTimeout(signOut({ callbackUrl: "/login" }), 15000, "O logout demorou para responder.");
    } catch {
      setError("Não foi possível sair. Tente novamente.");
    } finally { setPending(false); }
  }

  return <div>
    <button type="button" disabled={!hydrated || pending} onClick={logout} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60">{pending ? "Saindo…" : "Sair"}</button>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
