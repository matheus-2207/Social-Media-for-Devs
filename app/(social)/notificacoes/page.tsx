import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getNotifications } from "@/lib/social";
import { parsePage } from "@/lib/posts";
import { NotificationList } from "@/components/notification-list";
import { NotificationBell } from "@/components/notification-bell";
import { withTimeout } from "@/lib/with-timeout";

export default async function NotificationsPage({ searchParams }: { searchParams: { page?: string | string[] } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { notifications, page, totalPages } = await withTimeout(getNotifications(session.user.id, parsePage(searchParams.page)), 10000, "Não foi possível carregar as notificações.");
  return <main className="page-shell"><header className="page-header"><h1 className="page-title">Notificações</h1><NotificationBell userId={session.user.id} /></header>
    <NotificationList notifications={notifications.map(item => ({ ...item, createdAt: item.createdAt.toISOString() }))} />
    {totalPages > 1 && <nav aria-label="Paginação de notificações" className="mt-6 flex justify-between text-sm text-accent">{page > 1 ? <Link href={`/notificacoes?page=${page - 1}`}>Anterior</Link> : <span />}<span>Página {page} de {totalPages}</span>{page < totalPages && <Link href={`/notificacoes?page=${page + 1}`}>Próxima</Link>}</nav>}
  </main>;
}
