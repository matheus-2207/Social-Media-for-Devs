import { z } from "zod";

export const languages = [
  ["plaintext", "Texto simples"], ["javascript", "JavaScript"], ["typescript", "TypeScript"],
  ["python", "Python"], ["java", "Java"], ["go", "Go"], ["rust", "Rust"],
  ["c", "C"], ["cpp", "C++"], ["csharp", "C#"], ["sql", "SQL"],
  ["xml", "HTML / XML"], ["css", "CSS"], ["bash", "Bash"], ["json", "JSON"], ["markdown", "Markdown"],
] as const;

export const postSchema = z.object({
  content: z.string().trim().min(1, "Escreva o conteúdo do post.").max(5000, "Use no máximo 5.000 caracteres no texto."),
  codeSnippet: z.string().max(20000, "Use no máximo 20.000 caracteres no código.").nullish(),
  language: z.string().refine((value) => value === "" || languages.some(([id]) => id === value), "Selecione uma linguagem válida.").nullish(),
  isQuestion: z.boolean().default(false),
}).transform((data) => {
  const codeSnippet = data.codeSnippet?.trim() ? data.codeSnippet : null;
  return { ...data, codeSnippet, language: codeSnippet ? data.language || "plaintext" : null };
});

export type EditablePost = {
  id: string;
  content: string;
  codeSnippet: string | null;
  language: string | null;
  isQuestion: boolean;
};

export type PresentedPost = EditablePost & { highlightedCode: string | null };

export type PostActionResult =
  | { success: true; updatedPost?: PresentedPost }
  | { success: false; error: string };
