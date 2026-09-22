import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { post: db } }));
import { getFeedPage, getFeedFilterOptions } from "@/lib/posts";
import { feedUrl, parseFeedFilters } from "@/lib/feed-filters";

beforeEach(() => { vi.resetAllMocks(); db.count.mockResolvedValue(23); db.findMany.mockResolvedValue([]); });
it.each([
  [{}, undefined],
  [{ tech: "javascript" }, { language: "javascript" }],
  [{ type: "question" as const }, { isQuestion: true }],
  [{ tech: "python", type: "question" as const }, { language: "python", isQuestion: true }],
])("aplica os mesmos filtros à contagem e aos posts", async (filters, where) => {
  const result = await getFeedPage(2, filters);
  expect(result).toMatchObject({ page: 2, totalPages: 3, total: 23 });
  expect(db.count.mock.calls[0][0].where).toEqual(where);
  expect(db.findMany.mock.calls[0][0]).toMatchObject({ skip: 10, take: 10 });
  expect(db.findMany.mock.calls[0][0].where).toEqual(where);
});
it("recalcula a página quando o último resultado é excluído", async () => {
  db.count.mockResolvedValue(10);
  const filters = { tech: "python", type: "question" as const };
  const result = await getFeedPage(2, filters);
  expect(result.page).toBe(1);
  expect(feedUrl(filters, result.page)).toBe("/feed?tech=python&type=question");
});
it("preserva filtros mesmo sem resultados", async () => {
  db.count.mockResolvedValue(0);
  expect(await getFeedPage(5, { tech: "unknown" })).toEqual({ posts: [], page: 1, total: 0, totalPages: 1 });
  expect(db.findMany.mock.calls[0][0].where).toEqual({ language: "unknown" });
});
it("extrai linguagens do banco e conta dúvidas da linguagem selecionada", async () => {
  db.groupBy.mockResolvedValue([{ language: "custom-language" }, { language: "python" }, { language: null }, { language: "" }]);
  db.count.mockResolvedValue(4);
  expect(await getFeedFilterOptions("python")).toEqual({ languages: ["custom-language", "python"], questionCount: 4 });
  expect(db.groupBy).toHaveBeenCalledWith({ by: ["language"], where: { language: { not: null } }, orderBy: { language: "asc" } });
  expect(db.count).toHaveBeenCalledWith({ where: { isQuestion: true, language: "python" } });
});
it("conta todas as dúvidas quando nenhuma tecnologia é selecionada", async () => {
  db.groupBy.mockResolvedValue([]);
  await getFeedFilterOptions();
  expect(db.count).toHaveBeenCalledWith({ where: { isQuestion: true } });
});
it("normaliza parâmetros e permite linguagens do banco sem lista fixa", () => {
  expect(parseFeedFilters({ tech: " custom-lang ", type: "question" })).toEqual({ tech: "custom-lang", type: "question" });
  expect(parseFeedFilters({ tech: ["python", "javascript"], type: "invalid" })).toEqual({});
  expect(parseFeedFilters({ tech: "x".repeat(101) })).toEqual({});
  expect(feedUrl({})).toBe("/feed");
  expect(feedUrl({ tech: "c++", type: "question" }, 3)).toBe("/feed?tech=c%2B%2B&type=question&page=3");
});
