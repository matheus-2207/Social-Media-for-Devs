export type FeedFilters = { tech?: string; type?: "question" };
export type FeedSearchParams = { page?: string | string[]; tech?: string | string[]; type?: string | string[] };

export function parseFeedFilters(params: FeedSearchParams): FeedFilters {
  const filters: FeedFilters = {};
  if (typeof params.tech === "string" && params.tech.trim() && params.tech.length <= 100) filters.tech = params.tech.trim();
  if (params.type === "question") filters.type = "question";
  return filters;
}

export function feedUrl(filters: FeedFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.tech) params.set("tech", filters.tech);
  if (filters.type === "question") params.set("type", "question");
  if (page > 1) params.set("page", String(page));
  return `/feed${params.size ? `?${params}` : ""}`;
}
