import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { PostForm } from "@/components/posts/post-form";
import { PostCard } from "@/components/posts/post-card";
import { getFeedPage, getFeedFilterOptions, parsePage } from "@/lib/posts";
import { NotificationBell } from "@/components/notification-bell";
import { FeedFilters } from "@/components/posts/feed-filters";
import { feedUrl, parseFeedFilters, type FeedSearchParams } from "@/lib/feed-filters";

export default async function FeedPage({ searchParams }: { searchParams: FeedSearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const requestedPage = parsePage(searchParams.page);
  const filters = parseFeedFilters(searchParams);
  const [{ posts, page, totalPages }, options] = await Promise.all([getFeedPage(requestedPage, filters), getFeedFilterOptions(filters.tech)]);
  if (requestedPage !== page) redirect(feedUrl(filters, page));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Feed</h1>
        <NotificationBell userId={session.user.id} />
      </header>
      <p className="mt-6 text-slate-600">Bem-vindo, {session.user.name}!</p>
      <section aria-label="Criar publicação" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <PostForm />
      </section>
      <FeedFilters languages={options.languages} questionCount={options.questionCount} />
      <section aria-label="Publicações recentes" className="mt-8 space-y-5">
        <h2 className="text-lg font-semibold">Publicações recentes</h2>
        {posts.length ? posts.map((post) => <PostCard key={post.id} post={post} currentUserId={session.user.id} />) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">{filters.tech || filters.type ? "Nenhuma publicação encontrada com esses filtros." : "Nenhum post ainda. Compartilhe a primeira publicação!"}</p>
        )}
      </section>
      {totalPages > 1 && <nav aria-label="Paginação do feed" className="mt-8 flex items-center justify-between gap-3 text-sm">
        {page > 1 ? <Link href={feedUrl(filters, page - 1)} rel="prev" className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">Anterior</Link> : <span className="px-4 py-2 text-slate-400" aria-disabled="true">Anterior</span>}
        <span>Página {page} de {totalPages}</span>
        {page < totalPages ? <Link href={feedUrl(filters, page + 1)} rel="next" className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">Próxima</Link> : <span className="px-4 py-2 text-slate-400" aria-disabled="true">Próxima</span>}
      </nav>}
    </main>
  );
}
