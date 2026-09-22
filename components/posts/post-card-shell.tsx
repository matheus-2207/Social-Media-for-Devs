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
    <article className="min-w-0 rounded-lg border border-line bg-surface p-5 sm:p-7">
      <header className="flex items-center gap-3">
        {children}
        {currentPost.isQuestion && <span className="shrink-0 rounded-md bg-raised px-3 py-1 text-xs font-medium text-muted">Dúvida</span>}
      </header>
      <p className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-7 text-ink">{currentPost.content}</p>
      {currentPost.codeSnippet && <div className="mt-5 overflow-hidden rounded-md border border-line bg-[#0d1117]">
        <div className="border-b border-line px-5 py-2.5 font-mono text-xs text-muted">{language}</div>
        <pre className={`${styles.codeBlock} overflow-x-auto p-5 font-mono text-[13px] leading-6`}>
          {currentPost.highlightedCode !== null ? <code className="hljs" dangerouslySetInnerHTML={{ __html: currentPost.highlightedCode }} /> : <code className="hljs">{currentPost.codeSnippet}</code>}
        </pre>
      </div>}
      {canEdit && <PostControls post={currentPost} onDeleted={handleDeleted} onUpdated={handleUpdated} />}
      {footer}
    </article>
  );
}
