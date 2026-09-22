import type { Prisma } from "@prisma/client";

export const commentSelect = {
  id: true, postId: true, authorId: true, content: true, createdAt: true,
  author: { select: { name: true, username: true, avatarUrl: true } },
} satisfies Prisma.CommentSelect;
