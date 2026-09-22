"use client";

import { useEffect, useId, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { deletePostFromForm } from "@/app/(social)/feed/actions";
import type { EditablePost, PresentedPost } from "@/lib/validation/post";
import { PostForm } from "./post-form";

export function PostControls({ post, onDeleted, onUpdated }: { post: EditablePost; onDeleted: () => void; onUpdated: (post: PresentedPost) => void }) {
  const editRef = useRef<HTMLDetailsElement>(null);
  const deleteRef = useRef<HTMLDetailsElement>(null);
  const confirmationId = useId();
  const [state, formAction] = useFormState(deletePostFromForm, null);

  useEffect(() => {
    if (!state?.success) return;
    onDeleted();
  }, [state, onDeleted]);

  return (
    <div className="mt-5 space-y-3 border-t border-line pt-4">
      <details ref={editRef}>
        <summary className="w-fit cursor-pointer rounded px-2 py-1 text-sm font-medium text-accent hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Editar</summary>
        <div className="mt-4">
          <PostForm post={post} onSaved={onUpdated} onClose={() => { if (editRef.current) editRef.current.open = false; }} />
        </div>
      </details>
      <details ref={deleteRef}>
        <summary className="w-fit cursor-pointer rounded px-2 py-1 text-sm font-medium text-danger hover:bg-danger-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger">Excluir</summary>
        <form action={formAction} aria-describedby={confirmationId} className="mt-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
          <input type="hidden" name="postId" value={post.id} />
          <p id={confirmationId} className="text-sm text-danger">Excluir este post? Os comentários e reações também serão removidos. Essa ação não pode ser desfeita.</p>
          <DeleteConfirmation onCancel={() => { if (deleteRef.current) deleteRef.current.open = false; }} />
          {state && !state.success && <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>}
        </form>
      </details>
    </div>
  );
}

function DeleteConfirmation({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} aria-busy={pending} className="mt-4 flex flex-wrap gap-3 disabled:opacity-60">
      <button type="submit" name="confirmDelete" value="yes" className="rounded-lg bg-danger-soft px-4 py-2 text-sm font-semibold text-white hover:bg-danger-soft disabled:cursor-wait">{pending ? "Excluindo…" : "Confirmar exclusão"}</button>
      <button type="button" onClick={onCancel} className="rounded-lg border border-control bg-surface px-4 py-2 text-sm hover:bg-raised">Cancelar</button>
    </fieldset>
  );
}
