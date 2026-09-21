import { hash } from "bcrypt";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie um formulário válido." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, username, email, password } = parsed.data;
  try {
    const passwordHash = await hash(password, 12);
    await prisma.user.create({ data: { name, username, email, passwordHash }, select: { id: true } });
    return NextResponse.json({ message: "Conta criada com sucesso." }, { status: 201 });
  } catch (error) {
    console.error(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (Array.isArray(error.meta?.target) && error.meta.target.includes("username")) return NextResponse.json({ error: "Este username já está em uso. Escolha outro." }, { status: 409 });
      return NextResponse.json({ error: "Não foi possível cadastrar este email. Tente fazer login." }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível criar sua conta. Tente novamente mais tarde." }, { status: 500 });
  }
}
