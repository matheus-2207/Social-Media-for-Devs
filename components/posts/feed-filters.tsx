"use client";

import { useId, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { feedUrl, parseFeedFilters, type FeedFilters as Filters } from "@/lib/feed-filters";
import { languages as languageOptions } from "@/lib/validation/post";

function languageLabel(value: string) {
  return languageOptions.find(([id]) => id === value)?.[1] ?? value;
}

export function FeedFilters({ languages, questionCount }: { languages: string[]; questionCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const techValues = searchParams.getAll("tech");
  const typeValues = searchParams.getAll("type");
  const filters = parseFeedFilters({ tech: techValues.length > 1 ? techValues : techValues[0], type: typeValues.length > 1 ? typeValues : typeValues[0] });
  const [pending, startTransition] = useTransition();
  const id = useId();
  function navigate(next: Filters) {
    startTransition(() => router.push(feedUrl(next), { scroll: false }));
  }
  const buttonClass = (selected: boolean) => `rounded-lg border px-4 py-2 text-sm font-semibold ${selected ? "border-accent bg-accent-soft text-accent" : "border-control bg-surface text-muted hover:bg-raised"}`;
  return <section aria-label="Filtros de publicações" aria-busy={pending} className="mt-8 space-y-3">
    <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
      <legend className="sr-only">Filtrar publicações</legend>
      <div role="group" aria-label="Tipo de publicação" className="flex gap-2">
        <button type="button" aria-pressed={!filters.type} onClick={() => navigate({ tech: filters.tech })} className={buttonClass(!filters.type)}>Todos</button>
        <button type="button" aria-pressed={filters.type === "question"} onClick={() => navigate({ ...filters, type: "question" })} className={buttonClass(filters.type === "question")}>Dúvidas ({questionCount})</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={id} className="text-sm font-medium">Tecnologia / linguagem</label>
        <select id={id} value={filters.tech ?? ""} onChange={event => navigate({ ...filters, tech: event.target.value || undefined })} className={`rounded-lg border px-3 py-2 text-sm ${filters.tech ? "border-accent bg-accent-soft text-accent" : "border-control bg-surface"}`}>
          <option value="">Todas as linguagens</option>
          {filters.tech && !languages.includes(filters.tech) && <option value={filters.tech}>{languageLabel(filters.tech)} (sem publicações)</option>}
          {languages.map(language => <option key={language} value={language}>{languageLabel(language)}</option>)}
        </select>
        {(filters.tech || filters.type) && <button type="button" onClick={() => navigate({})} className="text-sm font-semibold text-accent hover:underline">Limpar filtros</button>}
      </div>
    </fieldset>
    <p role="status" className="text-sm text-subtle">{pending ? "Atualizando publicações…" : `${filters.type ? "Dúvidas" : "Todos os posts"} · ${filters.tech ? languageLabel(filters.tech) : "Todas as linguagens"}`}</p>
    {filters.tech && <p className="text-xs text-subtle">O contador de dúvidas considera a linguagem selecionada.</p>}
  </section>;
}
