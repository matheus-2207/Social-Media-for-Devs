"use client";

import { useEffect, useState } from "react";

export default function FeedLoading() {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  return <main className="page-shell">
    {timedOut ? <div role="alert">
      <h1 className="text-xl font-semibold">O feed demorou para responder</h1>
      <p className="mt-3 text-muted">Não foi possível concluir o carregamento. Tente novamente.</p>
      <a href="/feed" className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-white">Tentar novamente</a>
    </div> : <p role="status" className="text-muted">Carregando publicações…</p>}
  </main>;
}
