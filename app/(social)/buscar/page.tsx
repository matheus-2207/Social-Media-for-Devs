import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { UserSearch } from "@/components/user-search";
import { NotificationBell } from "@/components/notification-bell";

export default async function SearchPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return <main className="mx-auto max-w-3xl px-6 py-10"><header className="flex items-center justify-between"><h1 className="text-2xl font-bold">Busca</h1><NotificationBell userId={session.user.id} /></header><UserSearch viewerId={session.user.id} /></main>;
}
