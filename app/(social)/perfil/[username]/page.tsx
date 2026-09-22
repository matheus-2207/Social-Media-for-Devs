import Link from "next/link";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getProfile, getProfilePosts } from "@/lib/profile";
import { getGithubRepositories } from "@/lib/github";
import { parsePage } from "@/lib/posts";
import { Avatar } from "@/components/posts/avatar";
import { PostCard } from "@/components/posts/post-card";
import { ProfileFollow } from "@/components/profile-follow";
import { NotificationBell } from "@/components/notification-bell";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ProfilePage({ params, searchParams }: { params: { username: string }; searchParams: { page?: string | string[] } }) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;
  const profile = await getProfile(params.username, viewerId);
  if (!profile) notFound();
  const { posts, page, totalPages } = await getProfilePosts(profile.id, parsePage(searchParams.page));
  const path = `/perfil/${encodeURIComponent(profile.username)}`;
  return <main className="page-shell">
    <header className="mb-6 flex items-center justify-end gap-4">
      {!viewerId && <Link href="/login" className="font-semibold text-accent hover:underline">Entrar</Link>}
      {viewerId && <div className="flex items-center gap-4"><NotificationBell userId={viewerId} />{viewerId === profile.id && <SignOutButton />}</div>}
    </header>
    <section className="rounded-lg border border-line bg-surface p-6 text-ink sm:p-8" aria-label="Perfil">
      <div className="flex items-center gap-4"><Avatar name={profile.name} url={profile.avatarUrl} /><div className="min-w-0"><h1 className="break-words page-title">{profile.name}</h1><p className="mt-1 break-words font-mono text-sm text-subtle">@{profile.username}</p></div></div>
      <p className="mt-6 max-w-prose whitespace-pre-wrap break-words text-[15px] leading-7 text-muted">{profile.bio || "Ainda sem bio."}</p>
      <ProfileFollow username={profile.username} userId={profile.id} canFollow={Boolean(viewerId && viewerId !== profile.id)} initialSummary={{ following: profile.isFollowing, followers: profile._count.followers }} followingCount={profile._count.following} />
    </section>
    {profile.githubUsername && <Suspense fallback={<p className="mt-6 text-sm text-subtle">Carregando repositórios…</p>}><Repositories username={profile.githubUsername} /></Suspense>}
    <section className="mt-10 space-y-6" aria-label="Publicações do usuário">
      <h2 className="text-lg font-semibold">Publicações</h2>
      {posts.length ? posts.map(post => <PostCard key={post.id} post={post} currentUserId={viewerId} />) : <p className="text-subtle">Nenhuma publicação ainda.</p>}
    </section>
    {totalPages > 1 && <nav aria-label="Paginação do perfil" className="mt-6 flex justify-between text-sm text-accent">
      {page > 1 ? <Link href={`${path}?page=${page - 1}`}>Anterior</Link> : <span />}
      <span>Página {page} de {totalPages}</span>
      {page < totalPages && <Link href={`${path}?page=${page + 1}`}>Próxima</Link>}
    </nav>}
  </main>;
}

async function Repositories({ username }: { username: string }) {
  const repositories = await getGithubRepositories(username);
  if (repositories === null) return <p className="mt-6 text-sm text-subtle">Repositórios do GitHub indisponíveis no momento.</p>;
  if (!repositories.length) return null;
  return <section className="mt-10" aria-label="Repositórios do GitHub"><h2 className="text-lg font-semibold">Repositórios recentes</h2><ul className="mt-4 grid gap-3 sm:grid-cols-3">
    {repositories.map(repo => <li key={repo.id} className="flex min-w-0 flex-col rounded-lg border border-line bg-surface p-5 text-ink hover:border-control">
      <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="break-words text-sm font-semibold text-ink hover:text-accent hover:underline">{repo.name}</a>
      <p className="mb-5 mt-3 break-words text-sm leading-6 text-muted">{repo.description || "Sem descrição."}</p>
      <p className="mt-auto font-mono text-xs text-subtle">{repo.language || "Linguagem não informada"}</p>
    </li>)}
  </ul></section>;
}
