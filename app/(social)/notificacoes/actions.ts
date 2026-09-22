"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationsRead(ids: string[]): Promise<{ success: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !Array.isArray(ids) || !ids.length || ids.length > 20 || ids.some(id => typeof id !== "string" || !id || id.length > 128)) return { success: false };
  try {
    await prisma.notification.updateMany({ where: { id: { in: ids }, userId: session.user.id, read: false }, data: { read: true } });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}
