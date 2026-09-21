"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toggleReaction } from "@/app/feed/interaction-actions";
import { reactionOptions, type ReactionSummary } from "@/lib/interactions";

export function ReactionBar({ postId, initialSummary, readOnly = false }: { postId: string; initialSummary: ReactionSummary; readOnly?: boolean }) {
  const [state, formAction] = useFormState(toggleReaction, null);
  const [confirmed, setConfirmed] = useState<ReactionSummary | null>(null);
  const handled = useRef<typeof state>(null);
  useEffect(() => {
    if (!state?.success || handled.current === state) return;
    handled.current = state;
    setConfirmed(state.summary);
  }, [state]);
  useEffect(() => {
    if (confirmed && initialSummary.selected === confirmed.selected &&
        reactionOptions.every(({ type }) => initialSummary.counts[type] === confirmed.counts[type])) setConfirmed(null);
  }, [initialSummary, confirmed]);

  if (readOnly) return <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600" aria-label="Reações do post">{reactionOptions.map(({ type, label, emoji }) => <span key={type}>{emoji} {label}: {initialSummary.counts[type]}</span>)}</div>;
  return <form action={formAction} className="mt-5" aria-label="Reações do post" data-reactions>
    <input type="hidden" name="postId" value={postId} />
    <ReactionButtons summary={confirmed ?? initialSummary} />
    {state && !state.success && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
    <span className="sr-only" role="status">{state?.success ? "Reação atualizada." : ""}</span>
  </form>;
}

function ReactionButtons({ summary }: { summary: ReactionSummary }) {
  const { pending } = useFormStatus();
  return <fieldset disabled={pending} aria-busy={pending} className="flex flex-wrap gap-2 disabled:opacity-60">
    <legend className="sr-only">Escolha uma reação; clique novamente para removê-la</legend>
    {reactionOptions.map(({ type, label, emoji }) => <button key={type} type="submit" name="type" value={type} aria-pressed={summary.selected === type} aria-label={`${label}: ${summary.counts[type]}`} title={summary.selected === type ? `Remover reação ${label}` : label} className={`rounded-full border px-3 py-2 text-sm transition-colors disabled:cursor-wait ${summary.selected === type ? "border-indigo-600 bg-indigo-100 font-semibold text-indigo-800" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
      <span aria-hidden="true">{emoji}</span> {label} <span>{summary.counts[type]}</span>
    </button>)}
  </fieldset>;
}
