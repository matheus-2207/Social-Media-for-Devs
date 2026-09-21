import "server-only";
import { z } from "zod";

const repositoriesSchema = z.array(z.object({
  id: z.number(), name: z.string(), description: z.string().nullable(), language: z.string().nullable(),
  html_url: z.string().url().refine(value => new URL(value).origin === "https://github.com"),
}));

export async function getGithubRepositories(username: string | null) {
  if (!username) return [];
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) return null;
  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=3`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const result = repositoriesSchema.safeParse(await response.json());
    return result.success ? result.data.slice(0, 3) : null;
  } catch {
    return null;
  }
}
