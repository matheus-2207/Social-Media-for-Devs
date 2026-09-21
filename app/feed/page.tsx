import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";
import { PostForm } from "@/components/posts/post-form";
import { PostCard } from "@/components/posts/post-card";
import { getFeedPage, parsePage } from "@/lib/posts";
import { MyProfileLink } from "@/components/my-profile-link";

export default async function FeedPage({ searchParams }: { searchParams: { page?: string | string[] } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const requestedPage = parsePage(searchParams.page);
  const { posts, page, totalPages } = await getFeedPage(requestedPage);
  if (requestedPage !== page) redirect(`/feed?page=${page}`);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Feed</h1>
        <nav aria-label="Conta" className="flex items-center gap-4"><MyProfileLink userId={session.user.id} /><SignOutButton /></nav>
      </header>
      <p className="mt-6 text-slate-600">Bem-vindo, {session.user.name}!</p>
      <section aria-label="Criar publicação" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <PostForm />
      </section>
      <section aria-label="Publicações recentes" className="mt-8 space-y-5">
        <h2 className="text-lg font-semibold">Publicações recentes</h2>
        {posts.length ? posts.map((post) => <PostCard key={post.id} post={post} currentUserId={session.user.id} />) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Nenhum post ainda. Compartilhe a primeira publicação!</p>
        )}
      </section>
      {totalPages > 1 && <nav aria-label="Paginação do feed" className="mt-8 flex items-center justify-between gap-3 text-sm">
        {page > 1 ? <Link href={`/feed?page=${page - 1}`} rel="prev" className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">Anterior</Link> : <span className="px-4 py-2 text-slate-400" aria-disabled="true">Anterior</span>}
        <span>Página {page} de {totalPages}</span>
        {page < totalPages ? <Link href={`/feed?page=${page + 1}`} rel="next" className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">Próxima</Link> : <span className="px-4 py-2 text-slate-400" aria-disabled="true">Próxima</span>}
      </nav>}
    </main>
  );
}
