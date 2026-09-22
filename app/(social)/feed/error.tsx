"use client";

export default function FeedError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-6 py-12">
    <h1 className="text-xl font-semibold">Não foi possível carregar o feed</h1>
    <p className="mt-3 text-slate-600">Tente novamente em alguns instantes.</p>
    <button type="button" onClick={reset} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-white">Tentar novamente</button>
  </main>;
}
