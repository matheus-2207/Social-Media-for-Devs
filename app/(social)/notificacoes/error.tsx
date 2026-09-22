"use client";
export default function NotificationsError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-6 py-10"><p role="alert">Não foi possível carregar as notificações.</p><button type="button" onClick={reset} className="mt-4 text-indigo-600 underline">Tentar novamente</button></main>;
}
