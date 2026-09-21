"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { languages, type PresentedPost } from "@/lib/validation/post";
import { PostControls } from "./post-controls";
import "highlight.js/styles/github-dark.css";
import styles from "./post-card.module.css";

export function PostCardShell({ children, post, canEdit, footer }: { children: ReactNode; post: PresentedPost; canEdit: boolean; footer?: ReactNode }) {
  const [deleted, setDeleted] = useState(false);
  const [savedPost, setSavedPost] = useState<PresentedPost | null>(null);
  const handleDeleted = useCallback(() => setDeleted(true), []);
  const handleUpdated = useCallback((updated: PresentedPost) => setSavedPost(updated), []);

  // Conserva a resposta confirmada da ação enquanto o refresh ainda estiver em trânsito.
  // Volta às props quando o servidor confirma a mesma versão do conteúdo.
  useEffect(() => {
    if (savedPost && post.id === savedPost.id && post.content === savedPost.content &&
        post.codeSnippet === savedPost.codeSnippet && post.language === savedPost.language &&
        post.isQuestion === savedPost.isQuestion) setSavedPost(null);
  }, [post, savedPost]);

  if (deleted) return null;
  const currentPost = savedPost ?? post;
  const language = languages.find(([id]) => id === currentPost.language)?.[1] ?? currentPost.language ?? "Texto simples";

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <header className="flex items-center gap-3">
        {children}
        {currentPost.isQuestion && <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Dúvida</span>}
      </header>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">{currentPost.content}</p>
      {currentPost.codeSnippet && <div className="mt-4 overflow-hidden rounded-xl bg-[#0d1117]">
        <div className="border-b border-slate-700 px-4 py-2 text-xs font-medium text-slate-300">{language}</div>
        <pre className={`${styles.codeBlock} overflow-x-auto p-4 text-sm leading-6`}>
          {currentPost.highlightedCode !== null ? <code className="hljs" dangerouslySetInnerHTML={{ __html: currentPost.highlightedCode }} /> : <code className="hljs">{currentPost.codeSnippet}</code>}
        </pre>
      </div>}
      {canEdit && <PostControls post={currentPost} onDeleted={handleDeleted} onUpdated={handleUpdated} />}
      {footer}
    </article>
  );
}
