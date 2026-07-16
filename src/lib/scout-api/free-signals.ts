const EXTERNAL_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch {
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
  const res = await fetchWithTimeout(`https://rdap.org/domain/${bare}`);
  if (!res || !res.ok) return {};
  try {
    const data = await res.json();
    const events = data.events ?? [];
    const registered = events.find((e) => e.eventAction === "registration")?.eventDate;
    if (!registered) return {};
    const regDate = new Date(registered);
    const ageYears = Math.round(((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
    return { registered: registered.slice(0, 10), age_years: ageYears };
  } catch {
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
  const res = await fetchWithTimeout(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`,
  );
  if (!res || !res.ok) return {};
  try {
    const data = await res.json();
    const score = data.lighthouseResult?.categories?.performance?.score;
    if (score == null) return {};
    return { performance_score: Math.round(score * 100) };
  } catch {
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
