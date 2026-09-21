import Link from "next/link";
export default function ProfileNotFound() {
  return <main className="mx-auto max-w-3xl px-6 py-16"><h1 className="text-2xl font-bold">Perfil não encontrado</h1><p className="mt-3 text-slate-600">Confira o username informado.</p><Link href="/" className="mt-6 inline-block text-indigo-600">Voltar ao início</Link></main>;
}
