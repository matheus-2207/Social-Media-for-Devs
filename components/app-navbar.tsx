"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const icons = {
  feed: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></>,
  chats: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z" />,
  profile: <><circle cx="12" cy="7" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></>,
};
export function AppNavbar({ username }: { username: string }) {
  const pathname = usePathname();
  const profilePath = `/perfil/${encodeURIComponent(username)}`;
  const links = [
    { href: "/feed", label: "Feed", icon: icons.feed },
    { href: "/buscar", label: "Busca", icon: icons.search },
    { href: "/chats", label: "Chats", icon: icons.chats },
    { href: profilePath, label: "Perfil", icon: icons.profile },
  ];
  return <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:left-0 md:right-auto md:w-56 md:border-r md:border-t-0 md:p-4">
    <p className="mb-8 mt-4 hidden px-3 font-bold text-indigo-700 md:block">Social Media for Devs</p>
    <ul className="grid grid-cols-4 gap-1 p-2 md:grid-cols-1 md:gap-3 md:p-0">{links.map(link => {
      const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
      return <li key={link.href}><Link href={link.href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 md:flex-row md:gap-3 md:px-4 md:text-sm ${active ? "bg-indigo-100 text-indigo-800" : "text-slate-600 hover:bg-slate-100"}`}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{link.icon}</svg>{link.label}
      </Link></li>;
    })}</ul>
  </nav>;
}
