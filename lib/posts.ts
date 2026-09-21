import "server-only";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/with-timeout";
import { commentSelect } from "@/lib/comment-select";

export const PAGE_SIZE = 10;

export function parsePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export async function getFeedPage(requestedPage: number) {
  return withTimeout(loadFeedPage(requestedPage), 10000, "O carregamento do feed excedeu o tempo limite.");
}

async function loadFeedPage(requestedPage: number) {
  const total = await prisma.post.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const posts = await prisma.post.findMany({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      comments: { select: commentSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      reactions: { select: { authorId: true, type: true } },
    },
  });
  return { posts, page, total, totalPages };
}

export type FeedPost = Awaited<ReturnType<typeof getFeedPage>>["posts"][number];
