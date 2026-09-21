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
import { MyProfileLink } from "@/components/my-profile-link";

export default async function ProfilePage({ params, searchParams }: { params: { username: string }; searchParams: { page?: string | string[] } }) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;
  const profile = await getProfile(params.username, viewerId);
  if (!profile) notFound();
  const { posts, page, totalPages } = await getProfilePosts(profile.id, parsePage(searchParams.page));
  const path = `/perfil/${encodeURIComponent(profile.username)}`;
  return <main className="mx-auto max-w-3xl px-6 py-10">
    <header className="mb-8 flex items-center justify-between gap-4">
      <Link href={viewerId ? "/feed" : "/login"} className="font-semibold text-indigo-600">{viewerId ? "Feed" : "Entrar"}</Link>
      {viewerId && <MyProfileLink userId={viewerId} />}
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-label="Perfil">
      <div className="flex items-center gap-4"><Avatar name={profile.name} url={profile.avatarUrl} /><div><h1 className="break-words text-2xl font-bold">{profile.name}</h1><p className="text-sm text-slate-500">@{profile.username}</p></div></div>
      <p className="mt-4 whitespace-pre-wrap break-words text-slate-700">{profile.bio || "Ainda sem bio."}</p>
      <ProfileFollow userId={profile.id} canFollow={Boolean(viewerId && viewerId !== profile.id)} initialSummary={{ following: profile.isFollowing, followers: profile._count.followers }} followingCount={profile._count.following} />
    </section>
    {profile.githubUsername && <Suspense fallback={<p className="mt-6 text-sm text-slate-500">Carregando repositórios…</p>}><Repositories username={profile.githubUsername} /></Suspense>}
    <section className="mt-8 space-y-5" aria-label="Publicações do usuário">
      <h2 className="text-lg font-semibold">Publicações</h2>
      {posts.length ? posts.map(post => <PostCard key={post.id} post={post} currentUserId={viewerId} />) : <p className="text-slate-500">Nenhuma publicação ainda.</p>}
    </section>
    {totalPages > 1 && <nav aria-label="Paginação do perfil" className="mt-6 flex justify-between text-sm text-indigo-600">
      {page > 1 ? <Link href={`${path}?page=${page - 1}`}>Anterior</Link> : <span />}
      <span>Página {page} de {totalPages}</span>
      {page < totalPages && <Link href={`${path}?page=${page + 1}`}>Próxima</Link>}
    </nav>}
  </main>;
}

async function Repositories({ username }: { username: string }) {
  const repositories = await getGithubRepositories(username);
  if (repositories === null) return <p className="mt-6 text-sm text-slate-500">Repositórios do GitHub indisponíveis no momento.</p>;
  if (!repositories.length) return null;
  return <section className="mt-8" aria-label="Repositórios do GitHub"><h2 className="text-lg font-semibold">Repositórios recentes</h2><ul className="mt-4 grid gap-3 sm:grid-cols-3">
    {repositories.map(repo => <li key={repo.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="break-words font-semibold text-indigo-600 hover:underline">{repo.name}</a>
      <p className="mt-2 break-words text-sm text-slate-600">{repo.description || "Sem descrição."}</p>
      <p className="mt-3 text-xs text-slate-500">{repo.language || "Linguagem não informada"}</p>
    </li>)}
  </ul></section>;
}
