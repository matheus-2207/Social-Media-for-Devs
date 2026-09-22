import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/with-timeout";
import { commentSelect } from "@/lib/comment-select";
import type { FeedFilters } from "@/lib/feed-filters";

export const PAGE_SIZE = 10;

export function parsePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export async function getFeedPage(requestedPage: number, filters: FeedFilters = {}) {
  return withTimeout(loadFeedPage(requestedPage, filters), 10000, "O carregamento do feed excedeu o tempo limite.");
}

async function loadFeedPage(requestedPage: number, filters: FeedFilters) {
  const query: { where?: Prisma.PostWhereInput } = filters.tech || filters.type ? { where: { ...(filters.tech ? { language: filters.tech } : {}), ...(filters.type === "question" ? { isQuestion: true } : {}) } } : {};
  const total = await prisma.post.count(query);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const posts = await prisma.post.findMany({
    ...query,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      comments: { select: commentSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      reactions: { select: { authorId: true, type: true } },
    },
  });
  return { posts, page, total, totalPages };
}

export type FeedPost = Awaited<ReturnType<typeof getFeedPage>>["posts"][number];

export async function getFeedFilterOptions(tech?: string) {
  return withTimeout(loadFilterOptions(tech), 10000, "O carregamento dos filtros excedeu o tempo limite.");
}

async function loadFilterOptions(tech?: string) {
  const [rows, questionCount] = await Promise.all([
    prisma.post.groupBy({ by: ["language"], where: { language: { not: null } }, orderBy: { language: "asc" } }),
    prisma.post.count({ where: { isQuestion: true, ...(tech ? { language: tech } : {}) } }),
  ]);
  return { languages: rows.flatMap(row => row.language ? [row.language] : []), questionCount };
}
