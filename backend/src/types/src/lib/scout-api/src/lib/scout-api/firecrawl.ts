// Firecrawl integration — direct TS port of backend/scout_agent.py's
// _scrape_domain, _discover_priority_urls, _search_funding_news.
// Uses Firecrawl's REST API directly via fetch (no SDK needed in Workers).

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const SCRAPE_TIMEOUT_MS = 20000;
const PRIORITY_PATH_KEYWORDS = ["career", "jobs", "about", "team", "pricing"] as const;
const MAX_PAGES_TOTAL = 4;
const MAX_CHARS_PER_PAGE = 6000;

export const FUNDING_KEYWORDS = [
  "raises", "raised", "funding round", "series a", "series b",
  "series c", "seed round", "seed funding", "closes round",
] as const;

function normalizeUrl(domain: string): string {
  let d = domain.trim();
  if (!d) throw new Error("Domain cannot be empty");
  if (!/^https?:\/\//.test(d)) d = `https://${d}`;
  const clean = d.replace(/^https?:\/\//, "");
  if (!clean.includes(".")) d = `https://${clean}.com`;
  return d;
}

async function firecrawlPost(apiKey: string, path: string, body: unknown): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);
  try {
    const res = await fetch(`${FIRECRAWL_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function singlePageMarkdown(apiKey: string, url: string): Promise<string | null> {
  const result = await firecrawlPost(apiKey, "/scrape", { url, formats: ["markdown"] });
  if (!result) return null;
  if (result.success === false) return null;
  const data = result.data ?? result;
  if (typeof data?.markdown === "string") return data.markdown;
  if (typeof data === "string") return data;
  return null;
}

async function discoverPriorityUrls(apiKey: string, baseUrl: string): Promise<string[]> {
  const mapped = await firecrawlPost(apiKey, "/map", { url: baseUrl });
  if (!mapped) return [];
  let links: string[] = [];
  if (Array.isArray(mapped)) links = mapped;
  else links = mapped.links ?? mapped.data ?? [];
  links = links.filter((l): l is string => typeof l === "string");

  const picked: string[] = [];
  for (const keyword of PRIORITY_PATH_KEYWORDS) {
    const match = links.find((l) => l.toLowerCase().includes(keyword) && !picked.includes(l));
    if (match) picked.push(match);
    if (picked.length >= MAX_PAGES_TOTAL - 1) break;
  }
  return picked;
}

/** Scrape homepage + up to 3 priority subpages (careers/about/pricing).
 * Falls back gracefully: partial failures still return whatever real content
 * we did get, rather than aborting the whole scan. Throws only if the
 * homepage itself is unreachable — nothing real to work with at that point. */
export async function scrapeDomain(apiKey: string, domain: string): Promise<{ url: string; content: string }> {
  const url = normalizeUrl(domain);
  const homepageMd = await singlePageMarkdown(apiKey, url);
  if (!homepageMd) {
    throw new Error("Firecrawl could not retrieve homepage content");
  }

  const pages = [homepageMd.slice(0, MAX_CHARS_PER_PAGE)];

  const subpages = await discoverPriorityUrls(apiKey, url);
  for (const subpageUrl of subpages) {
    const subMd = await singlePageMarkdown(apiKey, subpageUrl);
    if (subMd) {
      pages.push(`\n\n--- Page: ${subpageUrl} ---\n${subMd.slice(0, MAX_CHARS_PER_PAGE)}`);
    }
  }

  return { url, content: pages.join("") };
}

export interface FundingResult {
  source_title?: string;
  source_url?: string;
  amount?: string;
  round?: string;
  source?: "tavily" | "firecrawl";
}

function extractFundingFromText(title: string, source: "tavily" | "firecrawl"): FundingResult | null {
  const titleLower = title.toLowerCase();
  if (!FUNDING_KEYWORDS.some((k) => titleLower.includes(k))) return null;
  const amountMatch = title.match(/\$[\d.]+\s?(million|billion|[mMbB])\b/);
  const roundMatch = titleLower.match(/(seed|series [a-d])/);
  return {
    source_title: title.trim().slice(0, 200),
    amount: amountMatch?.[0] ?? "",
    round: roundMatch ? roundMatch[0].replace(/\b\w/g, (c) => c.toUpperCase()) : "",
    source,
  };
}

/** Firecrawl's /search endpoint as a fallback funding lookup when Tavily has
 * no key or no result. Never fabricates — empty object means nothing found. */
export async function searchFundingNewsFirecrawl(apiKey: string, companyName: string): Promise<FundingResult> {
  const result = await firecrawlPost(apiKey, "/search", {
    query: `${companyName} funding round raises million`,
    limit: 5,
  });
  if (!result) return {};
  const items: any[] = Array.isArray(result) ? result : result.data ?? result.results ?? [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const title = `${item.title ?? ""} ${item.description ?? ""}`;
    const found = extractFundingFromText(title, "firecrawl");
    if (found) return { ...found, source_url: item.url ?? "" };
  }
  return {};
}
