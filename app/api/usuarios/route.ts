import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { searchUsers } from "@/lib/user-search";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Entre na sua conta para buscar pessoas." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.length > 100) return NextResponse.json({ error: "Use no máximo 100 caracteres." }, { status: 400 });
  try {
    return NextResponse.json({ users: await searchUsers(query, session.user.id) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível buscar usuários. Tente novamente." }, { status: 503 });
  }
}
