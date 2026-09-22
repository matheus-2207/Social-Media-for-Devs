import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function NotificationBell({ userId }: { userId: string }) {
  const unread = await prisma.notification.count({ where: { userId, read: false } });
  return <Link href="/notificacoes" aria-label={`Notificações: ${unread} não lidas`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-indigo-700 hover:bg-indigo-50">
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
    {unread > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">{unread}</span>}
  </Link>;
}
