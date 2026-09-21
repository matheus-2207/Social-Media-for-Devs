import { z } from "zod";

const email = z.string().trim().toLowerCase().min(1, "Informe seu email.").email("Informe um email válido.").max(254, "Email muito longo.");
const password = z.string().min(1, "Informe sua senha.").refine(
  (value) => new TextEncoder().encode(value).length <= 72,
  "A senha deve ter no máximo 72 bytes.",
);

export const loginSchema = z.object({ email, password });
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome.").max(100, "Use no máximo 100 caracteres."),
  username: z.string().trim().toLowerCase().min(3, "Use pelo menos 3 caracteres no username.").max(30, "Use no máximo 30 caracteres no username.").regex(/^[a-z0-9][a-z0-9_-]*$/, "Use letras, números, hífen ou sublinhado no username."),
  email,
  password: password.refine((value) => value.length >= 8, "Use pelo menos 8 caracteres na senha."),
});
