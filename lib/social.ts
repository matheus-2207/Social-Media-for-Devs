import "server-only";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/with-timeout";

export async function getConnections(userId: string, kind: "seguidores" | "seguindo", viewerId: string | null, requestedPage: number) {
  return withTimeout(loadConnections(userId, kind, viewerId, requestedPage), 10000, "A lista demorou para carregar.");
}
async function loadConnections(userId: string, kind: "seguidores" | "seguindo", viewerId: string | null, requestedPage: number) {
  const where = kind === "seguidores" ? { following: { some: { followingId: userId } } } : { followers: { some: { followerId: userId } } };
  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(requestedPage, totalPages);
  const users = await prisma.user.findMany({ where, skip: (page - 1) * 20, take: 20, orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, username: true, avatarUrl: true,
      followers: { where: { followerId: viewerId ?? "" }, select: { followerId: true } },
      _count: { select: { followers: true, following: true } },
    },
  });
  return { users, page, totalPages, total };
}

export async function getNotifications(userId: string, requestedPage: number) {
  const total = await prisma.notification.count({ where: { userId } });
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(requestedPage, totalPages);
  const notifications = await prisma.notification.findMany({ where: { userId }, skip: (page - 1) * 20, take: 20, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, read: true, createdAt: true, actor: { select: { name: true, username: true, avatarUrl: true } } },
  });
  return { notifications, page, totalPages };
}
