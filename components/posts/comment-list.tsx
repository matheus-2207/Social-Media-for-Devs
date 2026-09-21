"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createComment, deleteComment } from "@/app/feed/interaction-actions";
import type { CommentView } from "@/lib/interactions";
import { Avatar } from "./avatar";
import Link from "next/link";

export function CommentList({ postId, currentUserId, initialComments }: { postId: string; currentUserId: string | null; initialComments: CommentView[] }) {
  const [added, setAdded] = useState<CommentView[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [state, formAction] = useFormState(createComment, null);
  const handled = useRef<typeof state>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (!state?.success || !("comment" in state) || handled.current === state) return;
    handled.current = state;
    setAdded(previous => [...previous.filter(comment => comment.id !== state.comment.id), state.comment]);
    formRef.current?.reset();
  }, [state]);
  useEffect(() => {
    const ids = new Set(initialComments.map(comment => comment.id));
    setAdded(previous => previous.filter(comment => !ids.has(comment.id)));
    setRemoved(previous => previous.filter(id => ids.has(id)));
  }, [initialComments]);
  const onDeleted = useCallback((id: string) => {
    setRemoved(previous => [...previous, id]);
    setAdded(previous => previous.filter(comment => comment.id !== id));
  }, []);
  const comments = [...new Map([...initialComments, ...added].map(comment => [comment.id, comment])).values()]
    .filter(comment => !removed.includes(comment.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  return <section aria-labelledby={headingId} className="mt-5 border-t border-slate-100 pt-5">
    <h3 id={headingId} className="text-sm font-semibold">Comentários ({comments.length})</h3>
    {comments.length ? <ul className="mt-4 space-y-4">
      {comments.map(comment => <li key={comment.id} className="flex items-start gap-3">
        <Avatar name={comment.author.name} url={comment.author.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="break-words text-sm font-semibold">{comment.author.name}</span>
            <time dateTime={comment.createdAt} className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{comment.content}</p>
          {comment.authorId === currentUserId && <DeleteCommentForm postId={postId} commentId={comment.id} onDeleted={onDeleted} />}
        </div>
      </li>)}
    </ul> : <p className="mt-3 text-sm text-slate-500">Seja o primeiro a comentar.</p>}
    {currentUserId ? <form ref={formRef} action={formAction} className="mt-5 space-y-2" data-comment-create>
      <input type="hidden" name="postId" value={postId} />
      <CommentFields />
      {state && !state.success && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state?.success && <p role="status" className="text-sm text-green-700">Comentário adicionado.</p>}
    </form> : <Link href="/login" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">Entre para comentar ou reagir</Link>}
  </section>;
}

function CommentFields() {
  const id = useId();
  const { pending } = useFormStatus();
  return <fieldset disabled={pending} aria-busy={pending} className="space-y-2 disabled:opacity-60">
    <label htmlFor={id} className="text-sm font-medium">Adicionar comentário</label>
    <textarea id={id} name="content" required maxLength={2000} rows={2} placeholder="Participe da conversa" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
    <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait">{pending ? "Comentando…" : "Comentar"}</button>
  </fieldset>;
}

function DeleteCommentForm({ postId, commentId, onDeleted }: { postId: string; commentId: string; onDeleted: (id: string) => void }) {
  const [state, formAction] = useFormState(deleteComment, null);
  const handled = useRef<typeof state>(null);
  useEffect(() => {
    if (!state?.success || !("deletedCommentId" in state) || handled.current === state) return;
    handled.current = state;
    onDeleted(state.deletedCommentId);
  }, [state, onDeleted]);
  return <form action={formAction} className="mt-1" data-comment-delete>
    <input type="hidden" name="postId" value={postId} />
    <input type="hidden" name="commentId" value={commentId} />
    <DeleteCommentButton />
    {state && !state.success && <p role="alert" className="mt-1 text-sm text-red-700">{state.error}</p>}
  </form>;
}

function DeleteCommentButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="text-xs font-medium text-red-700 hover:underline disabled:opacity-60">{pending ? "Excluindo…" : "Excluir comentário"}</button>;
}
