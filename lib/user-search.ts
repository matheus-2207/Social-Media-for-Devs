import "server-only";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/with-timeout";

export async function searchUsers(query: string, viewerId: string) {
  const term = query.trim().replace(/^@/, "").trim();
  if (!term || term.length > 100) return [];
  // LIKE trata % e _ como curingas; aqui a pesquisa deve ser literal.
  const literal = term.replace(/[\\%_]/g, "\\$&");
  const users = await withTimeout(prisma.user.findMany({
    where: { OR: [{ username: { contains: literal, mode: "insensitive" } }, { name: { contains: literal, mode: "insensitive" } }] },
    orderBy: [{ username: "asc" }, { id: "asc" }], take: 20,
    select: { id: true, name: true, username: true, avatarUrl: true,
      followers: { where: { followerId: viewerId }, select: { followerId: true } },
      _count: { select: { followers: true, following: true } },
    },
  }), 10000, "A busca demorou para responder.");
  return users.map(user => ({ id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl,
    isFollowing: user.followers.length > 0, followers: user._count.followers, following: user._count.following,
  }));
}
