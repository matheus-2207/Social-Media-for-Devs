import type { FeedPost } from "@/lib/posts";
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
        <Avatar name={post.author.name} url={post.author.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold">{post.author.name}</p>
          <time dateTime={post.createdAt.toISOString()} title={post.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} className="text-xs text-slate-500">{relativeDate(post.createdAt)}</time>
        </div>
    </PostCardShell>
  );
}
