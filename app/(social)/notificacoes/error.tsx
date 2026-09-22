"use client";
export default function NotificationsError({ reset }: { reset: () => void }) {
  return <main className="page-shell"><p role="alert">Não foi possível carregar as notificações.</p><button type="button" onClick={reset} className="mt-4 text-accent underline">Tentar novamente</button></main>;
}
