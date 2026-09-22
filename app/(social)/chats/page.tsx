import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function ChatsPage() {
  if (!(await getServerSession(authOptions))?.user?.id) redirect("/login");
  return <main className="page-shell"><h1 className="page-title">Chats</h1><p className="mt-6 text-subtle">Em breve</p></main>;
}
