// Main orchestrator — direct TS port of backend/scout_agent.py's
// run_scout / _run_scout_uncached. Runs the free keyless signals (domain age,
// pagespeed) in parallel with the main scrape/LLM pipeline via Promise.all,
// mirroring the Python ThreadPoolExecutor approach.

import { bareDomain, getDomainAge, getLogoUrl, getPagespeedScore, detectTechStackFromHtml } from "./free-signals";
import { scrapeDomain, searchFundingNewsFirecrawl, type FundingResult } from "./firecrawl";
import { searchFundingNewsTavily } from "./tavily";
import { analyzeProfile, generateMessage, type ScoutProfile } from "./groq";
import {
  detectCompanySize,
  getDynamicMetrics,
  getStructuralSignal,
  generateInfrastructureAlerts,
  scoreLead,
  type Alert,
  type Metrics,
} from "./logic";

export interface ScoutResult {
  domain: string;
  profile: ScoutProfile;
  message: string;
  score: "HOT" | "WARM" | "COLD";
  score_num: number;
  structural_signal: string;
  infrastructure_alerts: Alert[];
  metrics: Metrics;
  readiness_index: number;
  funding: FundingResult;
  logo_url: string;
  domain_age: { registered?: string; age_years?: number };
  pagespeed: { performance_score?: number };
}

export interface ScoutEnv {
  GROQ_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  TAVILY_API_KEY?: string;
}

async function searchFunding(env: ScoutEnv, companyName: string): Promise<FundingResult> {
  const tavilyResult = await searchFundingNewsTavily(env.TAVILY_API_KEY, companyName);
  if (tavilyResult.round || tavilyResult.amount || tavilyResult.source_title) return tavilyResult;

  if (!env.FIRECRAWL_API_KEY) return {};
  return searchFundingNewsFirecrawl(env.FIRECRAWL_API_KEY, companyName);
}

async function runScoutUncached(env: ScoutEnv, domain: string): Promise<ScoutResult> {
  if (!env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
  if (!env.FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not set");

  // Free, keyless signals run in parallel with the main pipeline — independent,
  // shouldn't add sequential latency.
  const ageAndSpeedPromise = Promise.all([getDomainAge(domain), getPagespeedScore(domain)]);

  const { content } = await scrapeDomain(env.FIRECRAWL_API_KEY, domain);
  const profile = await analyzeProfile(env.GROQ_API_KEY, domain, content);

  // Override LLM-guessed tech_stack with real pattern-matched detection
  profile.tech_stack = detectTechStackFromHtml(content);

  const funding = await searchFunding(env, profile.name);

  const structuralSignal = getStructuralSignal(profile, content);
  const size = profile.size || detectCompanySize(content, profile.signals);
  const metrics = getDynamicMetrics(size);
  const alerts = generateInfrastructureAlerts(profile, funding);
  const message = await generateMessage(env.GROQ_API_KEY, domain, profile, content);
  const { score, scoreNum } = scoreLead(profile);
  const readinessIndex = Math.min(65, Math.max(30, scoreNum - 10));

  const [domainAge, pagespeed] = await ageAndSpeedPromise;

  return {
    domain: domain.trim(),
    profile,
    message,
    score,
    score_num: scoreNum,
    structural_signal: structuralSignal,
    infrastructure_alerts: alerts,
    metrics,
    readiness_index: readinessIndex,
    funding,
    logo_url: getLogoUrl(domain),
    domain_age: domainAge,
    pagespeed,
  };
}

// In-memory cache — same behavior as the Python dict-based cache. Note: in a
// Cloudflare Worker this resets per-isolate, so it's a best-effort dedup
// within a warm isolate rather than a durable cache. That's fine here; it
// still absorbs rapid repeat lookups of the same domain from one visitor.
const CACHE = new Map<string, { at: number; result: ScoutResult }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function runScout(env: ScoutEnv, domain: string): Promise<ScoutResult> {
  const cacheKey = bareDomain(domain);
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.result;
  }
  const result = await runScoutUncached(env, domain);
  CACHE.set(cacheKey, { at: Date.now(), result });
  return result;
}
