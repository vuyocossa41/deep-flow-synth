import { bareDomain, getDomainAge, getLogoUrl, getPagespeedScore, detectTechStackFromHtml } from "./free-signals";
import { scrapeDomain, searchFundingNewsFirecrawl } from "./firecrawl";
import { searchFundingNewsTavily } from "./tavily";
import { analyzeProfile, generateMessage } from "./groq";
import { detectCompanySize, getDynamicMetrics, getStructuralSignal, generateInfrastructureAlerts, scoreLead } from "./logic";

const ENRICHMENT_GRACE_MS = 5000;

function withGracePeriod(promise, graceMs) {
  const fallback = new Promise(function(resolve) {
    setTimeout(function() { resolve({}); }, graceMs);
  });
  return Promise.race([promise.catch(function() { return {}; }), fallback]);
}

async function searchFunding(env, companyName) {
  const tavilyResult = await searchFundingNewsTavily(env.TAVILY_API_KEY, companyName);
  if (tavilyResult.round || tavilyResult.amount || tavilyResult.source_title) return tavilyResult;

  if (!env.FIRECRAWL_API_KEY) return {};
  return searchFundingNewsFirecrawl(env.FIRECRAWL_API_KEY, companyName);
}

async function runScoutUncached(env, domain) {
  if (!env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
  if (!env.FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not set");

  const domainAgePromise = getDomainAge(domain);
  const pagespeedPromise = getPagespeedScore(domain);

  const scraped = await scrapeDomain(env.FIRECRAWL_API_KEY, domain);
  const content = scraped.content;
  const profile = await analyzeProfile(env.GROQ_API_KEY, domain, content);

  profile.tech_stack = detectTechStackFromHtml(content);

  const funding = await searchFunding(env, profile.name);

  const structuralSignal = getStructuralSignal(profile, content);
  const size = profile.size || detectCompanySize(content, profile.signals);
  const metrics = getDynamicMetrics(size);
  const alerts = generateInfrastructureAlerts(profile, funding);
  const message = await generateMessage(env.GROQ_API_KEY, domain, profile, content);
  const scored = scoreLead(profile);
  const readinessIndex = Math.min(65, Math.max(30, scored.scoreNum - 10));

  const domainAge = await withGracePeriod(domainAgePromise, ENRICHMENT_GRACE_MS);
  const pagespeed = await withGracePeriod(pagespeedPromise, ENRICHMENT_GRACE_MS);

  return {
    domain: domain.trim(),
    profile: profile,
    message: message,
    score: scored.score,
    score_num: scored.scoreNum,
    structural_signal: structuralSignal,
    infrastructure_alerts: alerts,
    metrics: metrics,
    readiness_index: readinessIndex,
    funding: funding,
    logo_url: getLogoUrl(domain),
    domain_age: domainAge,
    pagespeed: pagespeed,
  };
}

const CACHE = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function runScout(env, domain) {
  const cacheKey = bareDomain(domain);
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.result;
  }
  const result = await runScoutUncached(env, domain);
  CACHE.set(cacheKey, { at: Date.now(), result: result });
  return result;
}
