import type { FeedPost } from "@/lib/posts";
import Link from "next/link";
import { highlightCode } from "@/lib/highlight-code";
import { relativeDate } from "@/lib/format-date";
import { Avatar } from "./avatar";
import { PostCardShell } from "./post-card-shell";
import { CommentList } from "./comment-list";
import { ReactionBar } from "./reaction-bar";
import { summarizeReactions } from "@/lib/interactions";

export function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string | null }) {
  return (
    <PostCardShell canEdit={post.authorId === currentUserId} post={{ id: post.id, content: post.content, codeSnippet: post.codeSnippet, language: post.language, isQuestion: post.isQuestion, highlightedCode: post.codeSnippet ? highlightCode(post.codeSnippet, post.language) : null }} footer={<>
      <ReactionBar postId={post.id} initialSummary={summarizeReactions(post.reactions, currentUserId)} readOnly={!currentUserId} />
      <CommentList postId={post.id} currentUserId={currentUserId} initialComments={post.comments.map(comment => ({ ...comment, createdAt: comment.createdAt.toISOString() }))} />
    </>}>
        <Link href={`/perfil/${encodeURIComponent(post.author.username)}`} aria-label={`Perfil de ${post.author.name}`}><Avatar name={post.author.name} url={post.author.avatarUrl} /></Link>
        <div className="min-w-0 flex-1">
          <Link href={`/perfil/${encodeURIComponent(post.author.username)}`} className="break-words font-semibold hover:underline">{post.author.name}</Link>
          <time dateTime={post.createdAt.toISOString()} title={post.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} className="text-xs text-slate-500">{relativeDate(post.createdAt)}</time>
        </div>
    </PostCardShell>
  );
}
