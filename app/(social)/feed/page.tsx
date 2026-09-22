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
    <main className="page-shell">
      <header className="page-header">
        <h1 className="page-title">Feed</h1>
        <NotificationBell userId={session.user.id} />
      </header>
      <p className="mt-6 text-muted">Bem-vindo, {session.user.name}!</p>
      <section aria-label="Criar publicação" className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-7">
        <PostForm />
      </section>
      <FeedFilters languages={options.languages} questionCount={options.questionCount} />
      <section aria-label="Publicações recentes" className="mt-10 space-y-6">
        <h2 className="text-lg font-semibold">Publicações recentes</h2>
        {posts.length ? posts.map((post) => <PostCard key={post.id} post={post} currentUserId={session.user.id} />) : (
          <p className="empty-state">{filters.tech || filters.type ? "Nenhuma publicação encontrada com esses filtros." : "Nenhum post ainda. Compartilhe a primeira publicação!"}</p>
        )}
      </section>
      {totalPages > 1 && <nav aria-label="Paginação do feed" className="mt-8 flex items-center justify-between gap-3 text-sm">
        {page > 1 ? <Link href={feedUrl(filters, page - 1)} rel="prev" className="rounded-lg border border-control px-4 py-2 hover:bg-raised">Anterior</Link> : <span className="px-4 py-2 text-subtle" aria-disabled="true">Anterior</span>}
        <span>Página {page} de {totalPages}</span>
        {page < totalPages ? <Link href={feedUrl(filters, page + 1)} rel="next" className="rounded-lg border border-control px-4 py-2 hover:bg-raised">Próxima</Link> : <span className="px-4 py-2 text-subtle" aria-disabled="true">Próxima</span>}
      </nav>}
    </main>
  );
}
