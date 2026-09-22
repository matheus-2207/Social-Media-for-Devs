import Link from "next/link";
export default function ProfileNotFound() {
  return <main className="page-shell"><h1 className="page-title">Perfil não encontrado</h1><p className="mt-3 text-muted">Confira o username informado.</p><Link href="/" className="mt-6 inline-block text-accent">Voltar ao início</Link></main>;
}
