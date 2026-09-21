import "server-only";
import { compare } from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

// Mantém a comparação bcrypt mesmo quando o email não existe.
const dummyHash = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email e senha",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
            select: { id: true, name: true, email: true, avatarUrl: true, passwordHash: true },
          });
          const valid = await compare(parsed.data.password, user?.passwordHash ?? dummyHash);
          if (!user || !valid) return null;

          return { id: user.id, name: user.name, email: user.email, image: user.avatarUrl };
        } catch {
          // O NextAuth pode devolver a mensagem ao cliente: não expor erros do banco.
          throw new Error("Não foi possível entrar. Tente novamente mais tarde.");
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};
