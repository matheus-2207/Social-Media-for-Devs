"use client";

import { useEffect, useId, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createPostFromForm, updatePostFromForm } from "@/app/feed/actions";
import { languages, type EditablePost, type PresentedPost } from "@/lib/validation/post";

export function PostForm({ post, onClose, onSaved }: { post?: EditablePost; onClose?: () => void; onSaved?: (post: PresentedPost) => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = post ? updatePostFromForm : createPostFromForm;
  const [state, formAction] = useFormState(action, null);
  const handledResult = useRef<typeof state>(null);

  useEffect(() => {
    if (!state?.success || handledResult.current === state) return;
    handledResult.current = state;
    if (post) {
      if (state.updatedPost) onSaved?.(state.updatedPost);
      onClose?.();
    } else {
      formRef.current?.reset();
      if (window.location.search) router.replace("/feed", { scroll: false });
    }
    // A Server Action já revalida o feed; não iniciar uma segunda navegação.
  }, [state, post, onClose, onSaved, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {post && <input type="hidden" name="postId" value={post.id} />}
      <PostFormFields post={post} onClose={onClose ? () => { formRef.current?.reset(); onClose(); } : undefined} />
      {state && !state.success && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state?.success && !post && <p role="status" className="text-sm text-green-700">Post publicado!</p>}
    </form>
  );
}

function PostFormFields({ post, onClose }: { post?: EditablePost; onClose?: () => void }) {
  const id = useId();
  const { pending } = useFormStatus();
  const fieldClass = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

  return (
      <fieldset disabled={pending} aria-busy={pending} className="min-w-0 space-y-4 disabled:opacity-60">
        <div>
          <label htmlFor={`${id}-content`} className="text-sm font-medium">{post ? "Editar publicação" : "Compartilhe com a comunidade"}</label>
          <textarea id={`${id}-content`} name="content" required maxLength={5000} rows={4} defaultValue={post?.content} placeholder="O que você está construindo? Qual é a sua dúvida?" className={fieldClass} />
        </div>
        <details open={post?.codeSnippet ? true : undefined} className="rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-indigo-700">Bloco de código (opcional)</summary>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor={`${id}-language`} className="text-sm font-medium">Linguagem</label>
              <select id={`${id}-language`} name="language" defaultValue={post?.language ? languages.some(([value]) => value === post.language) ? post.language : "plaintext" : "javascript"} className={fieldClass}>
                {languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-code`} className="text-sm font-medium">Código</label>
              <textarea id={`${id}-code`} name="codeSnippet" maxLength={20000} rows={6} defaultValue={post?.codeSnippet ?? ""} spellCheck={false} autoCapitalize="off" autoCorrect="off" placeholder="Cole seu código aqui" className={`${fieldClass} font-mono text-sm`} />
            </div>
          </div>
        </details>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isQuestion" defaultChecked={post?.isQuestion} className="h-4 w-4 accent-indigo-600" />
          É uma dúvida
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait">{pending ? "Salvando…" : post ? "Salvar alterações" : "Publicar"}</button>
          {onClose && <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>}
        </div>
      </fieldset>
  );
}
