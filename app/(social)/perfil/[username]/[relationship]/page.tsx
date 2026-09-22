import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { getConnections } from "@/lib/social";
import { parsePage } from "@/lib/posts";
import { Avatar } from "@/components/posts/avatar";
import { ProfileFollow } from "@/components/profile-follow";
import { NotificationBell } from "@/components/notification-bell";

export default async function ConnectionsPage({ params, searchParams }: { params: { username: string; relationship: string }; searchParams: { page?: string | string[] } }) {
  const kind = params.relationship;
  if (kind !== "seguidores" && kind !== "seguindo") notFound();
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;
  const owner = await getProfile(params.username, viewerId);
  if (!owner) notFound();
  const { users, page, totalPages, total } = await getConnections(owner.id, kind, viewerId, parsePage(searchParams.page));
  const profilePath = `/perfil/${encodeURIComponent(owner.username)}`;
  return <main className="page-shell">
    <header className="flex items-center justify-between"><Link href={profilePath} className="text-accent hover:underline">Perfil de {owner.name}</Link>{viewerId && <NotificationBell userId={viewerId} />}</header>
    <h1 className="mt-6 page-title">{kind === "seguidores" ? "Seguidores" : "Seguindo"} ({total})</h1>
    <ul className="mt-6 space-y-3">{users.map(user => <li key={user.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-surface p-5 text-ink hover:border-control">
      <Link href={`/perfil/${encodeURIComponent(user.username)}`} className="flex min-w-0 items-center gap-3 hover:underline"><Avatar name={user.name} url={user.avatarUrl} /><span className="min-w-0 break-words"><span className="block font-semibold text-ink">{user.name}</span><span className="font-mono text-sm text-subtle">@{user.username}</span></span></Link>
      {viewerId === owner.id && user.id !== viewerId && <ProfileFollow compact userId={user.id} canFollow initialSummary={{ following: user.followers.length > 0, followers: user._count.followers }} followingCount={user._count.following} />}
    </li>)}</ul>
    {!users.length && <p className="mt-6 text-subtle">Nenhuma pessoa nesta lista ainda.</p>}
    {totalPages > 1 && <nav aria-label="Paginação de pessoas" className="mt-6 flex justify-between text-sm text-accent">{page > 1 ? <Link href={`${profilePath}/${kind}?page=${page - 1}`}>Anterior</Link> : <span />}<span>Página {page} de {totalPages}</span>{page < totalPages && <Link href={`${profilePath}/${kind}?page=${page + 1}`}>Próxima</Link>}</nav>}
  </main>;
}
