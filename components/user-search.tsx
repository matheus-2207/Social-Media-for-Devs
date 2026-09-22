"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/posts/avatar";
import { ProfileFollow } from "@/components/profile-follow";

type UserResult = { id: string; name: string; username: string; avatarUrl: string | null; isFollowing: boolean; followers: number; following: number };
export function UserSearch({ viewerId }: { viewerId: string }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [phase, setPhase] = useState<"initial" | "loading" | "done" | "error">("initial");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const term = query.trim().replace(/^@/, "").trim();
    if (!term) { setUsers([]); setPhase("initial"); return; }
    let active = true;
    const controller = new AbortController();
    setPhase("loading");
    setUsers([]);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(`/api/usuarios?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("search failed");
        const data = await response.json();
        if (active) { setUsers(data.users); setPhase("done"); }
      } catch {
        if (active) setPhase("error");
      } finally { clearTimeout(timeout); }
    }, 300);
    return () => { active = false; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [query, retry]);
  return <section className="mt-6" aria-label="Buscar pessoas">
    <label htmlFor="user-search" className="text-sm font-medium">Username ou nome</label>
    <input id="user-search" type="search" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} placeholder="@username ou nome" autoComplete="off" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
    <div aria-live="polite" className="mt-5 text-sm text-slate-500">
      {phase === "initial" && <p>Digite um @username ou nome para buscar.</p>}
      {phase === "loading" && <p role="status">Buscando usuários…</p>}
      {phase === "done" && !users.length && <p>Nenhum usuário encontrado</p>}
      {phase === "error" && <p role="alert">Não foi possível buscar usuários. <button type="button" onClick={() => setRetry(value => value + 1)} className="text-indigo-600 underline">Tentar novamente</button></p>}
    </div>
    {phase === "done" && users.length > 0 && <><ul className="mt-5 space-y-3">{users.map(user => <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <Link href={`/perfil/${encodeURIComponent(user.username)}`} className="flex min-w-0 items-center gap-3 hover:underline"><Avatar name={user.name} url={user.avatarUrl} /><span className="min-w-0 break-words"><span className="block font-semibold">{user.name}</span><span className="text-sm text-slate-500">@{user.username}</span></span></Link>
      {user.id !== viewerId && <ProfileFollow compact userId={user.id} canFollow initialSummary={{ following: user.isFollowing, followers: user.followers }} followingCount={user.following} />}
    </li>)}</ul>{users.length === 20 && <p className="mt-4 text-sm text-slate-500">Mostrando até 20 pessoas. Refine a busca para encontrar outras.</p>}</>}
  </section>;
}
