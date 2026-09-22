import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function ChatsPage() {
  if (!(await getServerSession(authOptions))?.user?.id) redirect("/login");
  return <main className="mx-auto max-w-3xl px-6 py-10"><h1 className="text-2xl font-bold">Chats</h1><p className="mt-6 text-slate-500">Em breve</p></main>;
}
