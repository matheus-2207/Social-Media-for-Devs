"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { setFollow } from "@/app/perfil/actions";
import type { FollowSummary } from "@/lib/follow";

export function ProfileFollow({ userId, canFollow, initialSummary, followingCount }: { userId: string; canFollow: boolean; initialSummary: FollowSummary; followingCount: number }) {
  const [state, action] = useFormState(setFollow, null);
  const [confirmed, setConfirmed] = useState<FollowSummary | null>(null);
  const handled = useRef<typeof state>(null);
  useEffect(() => {
    if (!state?.success || handled.current === state) return;
    handled.current = state;
    setConfirmed(state.summary);
  }, [state]);
  useEffect(() => {
    if (confirmed?.following === initialSummary.following && confirmed.followers === initialSummary.followers) setConfirmed(null);
  }, [initialSummary, confirmed]);
  const summary = confirmed ?? initialSummary;
  return <div className="mt-4 space-y-4">
    <p className="text-sm text-slate-600"><strong>{summary.followers}</strong> seguidores <span className="mx-2">·</span> <strong>{followingCount}</strong> seguindo</p>
    {canFollow && <form action={action} data-follow>
      <input type="hidden" name="userId" value={userId} />
      <FollowButton following={summary.following} />
      {state && !state.success && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
      <span role="status" className="sr-only">{state?.success ? "Lista de seguidores atualizada." : ""}</span>
    </form>}
  </div>;
}

function FollowButton({ following }: { following: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" name="intent" value={following ? "unfollow" : "follow"} disabled={pending} aria-pressed={following} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{pending ? "Aguarde…" : following ? "Deixar de seguir" : "Seguir"}</button>;
}
