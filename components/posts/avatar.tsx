"use client";

import { useState } from "react";

export function Avatar({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  if (!url || !/^https?:\/\//i.test(url) || failed) {
    return <span aria-label={`Avatar de ${name}`} role="img" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-sm font-semibold text-accent">{initials || "?"}</span>;
  }
  // Avatares externos são exibidos diretamente, sem proxy de imagens do servidor.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`Avatar de ${name}`} width={40} height={40} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-10 w-10 shrink-0 rounded-md object-cover" />;
}
