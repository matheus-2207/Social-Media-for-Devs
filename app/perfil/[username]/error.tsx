"use client";
export default function ProfileError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-6 py-16"><p role="alert">Não foi possível carregar o perfil.</p><button type="button" onClick={reset} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white">Tentar novamente</button></main>;
}
