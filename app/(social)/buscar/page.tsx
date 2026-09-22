import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { UserSearch } from "@/components/user-search";
import { NotificationBell } from "@/components/notification-bell";

export default async function SearchPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return <main className="page-shell"><header className="page-header"><h1 className="page-title">Busca</h1><NotificationBell userId={session.user.id} /></header><UserSearch viewerId={session.user.id} /></main>;
}
