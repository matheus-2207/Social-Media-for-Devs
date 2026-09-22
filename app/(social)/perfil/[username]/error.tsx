"use client";
export default function ProfileError({ reset }: { reset: () => void }) {
  return <main className="page-shell"><p role="alert">Não foi possível carregar o perfil.</p><button type="button" onClick={reset} className="mt-4 rounded-lg bg-primary px-4 py-2 text-white">Tentar novamente</button></main>;
}
