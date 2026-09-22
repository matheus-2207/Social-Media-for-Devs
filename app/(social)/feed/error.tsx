"use client";

export default function FeedError({ reset }: { reset: () => void }) {
  return <main className="page-shell">
    <h1 className="text-xl font-semibold">Não foi possível carregar o feed</h1>
    <p className="mt-3 text-muted">Tente novamente em alguns instantes.</p>
    <button type="button" onClick={reset} className="mt-5 rounded-lg bg-primary px-4 py-2 text-white">Tentar novamente</button>
  </main>;
}
