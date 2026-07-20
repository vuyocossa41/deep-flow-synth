const DEFAULT_TIMEOUT_MS = 8000;
const RDAP_TIMEOUT_MS = 10000;
const PAGESPEED_TIMEOUT_MS = 25000;

async function fetchWithTimeout(url, init, timeoutMs) {
  const ms = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (err) {
    console.error("fetchWithTimeout failed for " + url + ": " + (err && err.message));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function bareDomain(domain) {
  let d = domain.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/^www\./, "");
  return d.split("/")[0];
}

export function getLogoUrl(domain) {
  return `https://logo.clearbit.com/${bareDomain(domain)}`;
}

export async function getDomainAge(domain) {
  const bare = bareDomain(domain);
  const url = `https://rdap.org/domain/${bare}`;
  console.log("[domain_age] fetching " + url);
  const res = await fetchWithTimeout(url, undefined, RDAP_TIMEOUT_MS);
  if (!res) {
    console.error("[domain_age] fetch returned null (timeout or network error) for " + bare);
    return {};
  }
  if (!res.ok) {
    console.error("[domain_age] non-ok status " + res.status + " for " + bare);
    return {};
  }
  try {
    const data = await res.json();
    const events = data.events ?? [];
    const registered = events.find((e) => e.eventAction === "registration")?.eventDate;
    if (!registered) {
      console.error("[domain_age] no registration event found for " + bare + ", raw keys: " + Object.keys(data).join(","));
      return {};
    }
    const regDate = new Date(registered);
    const ageYears = Math.round(((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
    console.log("[domain_age] success for " + bare + ": " + ageYears + " years");
    return { registered: registered.slice(0, 10), age_years: ageYears };
  } catch (err) {
    console.error("[domain_age] JSON parse failed for " + bare + ": " + (err && err.message));
    return {};
  }
}

export async function getPagespeedScore(domain) {
  const bare = bareDomain(domain);
  const params = new URLSearchParams({
    url: `https://${bare}`,
    strategy: "mobile",
    category: "performance",
  });
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
  console.log("[pagespeed] fetching " + url);
  const res = await fetchWithTimeout(url, undefined, PAGESPEED_TIMEOUT_MS);
  if (!res) {
    console.error("[pagespeed] fetch returned null (timeout or network error) for " + bare);
    return {};
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[pagespeed] non-ok status " + res.status + " for " + bare + ": " + body.slice(0, 300));
    return {};
  }
  try {
    const data = await res.json();
    const score = data.lighthouseResult?.categories?.performance?.score;
    if (score == null) {
      console.error("[pagespeed] no performance score in response for " + bare + ", raw keys: " + Object.keys(data).join(","));
      return {};
    }
    console.log("[pagespeed] success for " + bare + ": " + Math.round(score * 100));
    return { performance_score: Math.round(score * 100) };
  } catch (err) {
    console.error("[pagespeed] JSON parse failed for " + bare + ": " + (err && err.message));
    return {};
  }
}

const TECH_SIGNATURES = {
  HubSpot: ["hs-scripts.com", "hubspot.com/", "_hsq"],
  Salesforce: ["force.com", "salesforce.com/", "pardot.com"],
  Intercom: ["intercom.io", "widget.intercom"],
  Segment: ["cdn.segment.com", "segment.io"],
  "Google Analytics": ["googletagmanager.com", "google-analytics.com"],
  Stripe: ["js.stripe.com", "stripe.com/v3"],
  Amplitude: ["amplitude.com", "cdn.amplitude"],
  Mixpanel: ["mixpanel.com"],
  Drift: ["drift.com"],
  Marketo: ["marketo.com", "mktoresp.com"],
  Zendesk: ["zdassets.com", "zendesk.com"],
  Clay: ["clay.com", "clay.run"],
  Apollo: ["apollo.io"],
  Calendly: ["calendly.com"],
};

export function detectTechStackFromHtml(rawContent) {
  const lower = rawContent.toLowerCase();
  const found = [];
  for (const [tool, signatures] of Object.entries(TECH_SIGNATURES)) {
    if (signatures.some((sig) => lower.includes(sig))) found.push(tool);
  }
  return found;
}
