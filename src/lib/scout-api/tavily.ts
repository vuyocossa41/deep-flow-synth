const EXTERNAL_TIMEOUT_MS = 8000;
const FUNDING_KEYWORDS = [
  "raises", "raised", "funding round", "series a", "series b",
  "series c", "seed round", "seed funding", "closes round",
];

export async function searchFundingNewsTavily(apiKey, companyName) {
  if (!apiKey) return {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_TIMEOUT_MS);
  let results = [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${companyName} funding round raises million`,
        max_results: 5,
        search_depth: "basic",
      }),
      signal: controller.signal,
    });
    if (!res.ok) return {};
    const data = await res.json();
    results = data.results ?? [];
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }

  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const title = `${item.title ?? ""} ${item.content ?? ""}`;
    const titleLower = title.toLowerCase();
    if (!FUNDING_KEYWORDS.some((k) => titleLower.includes(k))) continue;
    const amountMatch = title.match(/\$[\d.]+\s?(million|billion|[mMbB])\b/);
    const roundMatch = titleLower.match(/(seed|series [a-d])/);
    return {
      source_title: title.trim().slice(0, 200),
      source_url: item.url ?? "",
      amount: amountMatch ? amountMatch[0] : "",
      round: roundMatch ? roundMatch[0].replace(/\b\w/g, (c) => c.toUpperCase()) : "",
      source: "tavily",
    };
  }
  return {};
}
