// Copiado apenas para o projeto temporário do teste de integração HTTP.
import { PostForm } from "@/components/posts/post-form";
import { PostCardShell } from "@/components/posts/post-card-shell";
import { AuthForm } from "@/components/auth-form";
import { SignOutButton } from "@/components/sign-out-button";
import { CommentList } from "@/components/posts/comment-list";
import { ReactionBar } from "@/components/posts/reaction-bar";
import { ProfileFollow } from "@/components/profile-follow";

export default function PostFormsFixture() {
  return <main>
    <section id="create"><PostForm /></section>
    <section id="existing"><PostCardShell canEdit post={{ id: "integration-post", content: "Post de teste", codeSnippet: "const test = 1;", language: "javascript", isQuestion: false, highlightedCode: null }}><span>Autor de teste</span></PostCardShell></section>
    <section id="login"><AuthForm mode="login" /></section>
    <CommentList postId="integration-post" currentUserId="user-1" initialComments={[{ id: "comment-1", postId: "integration-post", authorId: "user-1", content: "Comentário de teste", createdAt: "2026-09-21T12:00:00.000Z", author: { name: "Dev", avatarUrl: null } }]} />
    <ReactionBar postId="integration-post" initialSummary={{ counts: { FUNCIONA: 0, CLEAN_CODE: 0, DUVIDOSO: 0 }, selected: null }} />
    <section id="register"><AuthForm mode="registro" /></section>
    <SignOutButton />
    <ProfileFollow userId="user-2" canFollow initialSummary={{ following: false, followers: 0 }} followingCount={0} />
  </main>;
}
