import "server-only";
import { prisma } from "@/lib/prisma";
import { commentSelect } from "@/lib/comment-select";
import { withTimeout } from "@/lib/with-timeout";

export function getProfile(username: string, viewerId: string | null) {
  return withTimeout(loadProfile(username, viewerId), 10000, "Não foi possível carregar o perfil a tempo.");
}

async function loadProfile(username: string, viewerId: string | null) {
  if (!/^[a-z0-9][a-z0-9_-]{2,127}$/i.test(username)) return null;
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true, name: true, bio: true, avatarUrl: true, githubUsername: true, _count: { select: { followers: true, following: true } } },
  });
  if (!user) return null;
  const relationship = viewerId && viewerId !== user.id ? await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: user.id } }, select: { followerId: true },
  }) : null;
  return { ...user, isFollowing: Boolean(relationship) };
}

export async function getProfilePosts(authorId: string, requestedPage: number) {
  return withTimeout(loadPosts(authorId, requestedPage), 10000, "Não foi possível carregar as publicações a tempo.");
}

async function loadPosts(authorId: string, requestedPage: number) {
  const total = await prisma.post.count({ where: { authorId } });
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const posts = await prisma.post.findMany({ where: { authorId }, skip: (page - 1) * 10, take: 10,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      comments: { select: commentSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      reactions: { select: { authorId: true, type: true } },
    },
  });
  return { posts, page, totalPages };
}
