"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { markNotificationsRead } from "@/app/(social)/notificacoes/actions";
import { Avatar } from "@/components/posts/avatar";

type Item = { id: string; read: boolean; createdAt: string; actor: { name: string; username: string; avatarUrl: string | null } };
export function NotificationList({ notifications }: { notifications: Item[] }) {
  const unreadKey = JSON.stringify(notifications.filter(item => !item.read).map(item => item.id));
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const ids: string[] = JSON.parse(unreadKey);
    if (!ids.length) return;
    let active = true;
    setError(false);
    markNotificationsRead(ids).then(result => { if (active) setError(!result.success); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [unreadKey, retry]);
  return <>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">Não foi possível marcar como lidas. <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Tentar novamente</button></p>}
    <ul className="mt-6 space-y-3">{notifications.map(item => <li key={item.id} className={`rounded-xl border p-4 ${item.read ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50"}`}>
      <Link href={`/perfil/${encodeURIComponent(item.actor.username)}`} className="flex items-center gap-3 hover:underline"><Avatar name={item.actor.name} url={item.actor.avatarUrl} /><span><span className="font-semibold">{item.actor.name}</span> começou a seguir você<span className="block text-xs text-slate-500">@{item.actor.username}</span></span></Link>
      <time dateTime={item.createdAt} className="mt-2 block text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>
    </li>)}</ul>
    {!notifications.length && <p className="mt-6 text-slate-500">Nenhuma notificação ainda.</p>}
  </>;
}
