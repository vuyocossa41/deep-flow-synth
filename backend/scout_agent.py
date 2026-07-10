import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Literal

import httpx
from dotenv import load_dotenv
from firecrawl import FirecrawlApp
from groq import Groq

load_dotenv()

GROQ_MODEL = "llama-3.3-70b-versatile"
Score = Literal["HOT", "WARM", "COLD"]

EXTERNAL_TIMEOUT = 8.0  # seconds, keep the free-signal calls fast and non-blocking


def _bare_domain(domain: str) -> str:
    d = domain.strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = re.sub(r"^www\.", "", d)
    return d.split("/")[0]


def get_logo_url(domain: str) -> str:
    """Clearbit Logo API — free, no key required."""
    return f"https://logo.clearbit.com/{_bare_domain(domain)}"


def get_domain_age(domain: str) -> dict[str, Any]:
    """RDAP — free, no key. Returns registration date and age in years, or empty on failure."""
    bare = _bare_domain(domain)
    try:
        with httpx.Client(timeout=EXTERNAL_TIMEOUT) as client:
            resp = client.get(f"https://rdap.org/domain/{bare}")
        if resp.status_code != 200:
            return {}
        data = resp.json()
        events = data.get("events", [])
        registered = next((e.get("eventDate") for e in events if e.get("eventAction") == "registration"), None)
        if not registered:
            return {}
        reg_date = datetime.fromisoformat(registered.replace("Z", "+00:00"))
        age_years = round((datetime.now(timezone.utc) - reg_date).days / 365.25, 1)
        return {"registered": registered[:10], "age_years": age_years}
    except Exception:
        return {}


def get_pagespeed_score(domain: str) -> dict[str, Any]:
    """Google PageSpeed Insights — free, no key needed for light/occasional use.
    Returns empty dict on failure/timeout rather than blocking the whole scan."""
    bare = _bare_domain(domain)
    try:
        with httpx.Client(timeout=EXTERNAL_TIMEOUT) as client:
            resp = client.get(
                "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
                params={"url": f"https://{bare}", "strategy": "mobile", "category": "performance"},
            )
        if resp.status_code != 200:
            return {}
        data = resp.json()
        score = data["lighthouseResult"]["categories"]["performance"]["score"]
        return {"performance_score": round(score * 100)}
    except Exception:
        return {}


def _normalize_url(domain: str) -> str:
    domain = domain.strip()
    if not domain:
        raise ValueError("Domain cannot be empty")
    if not domain.startswith(("http://", "https://")):
        domain = f"https://{domain}"
    clean = domain.replace("https://", "").replace("http://", "")
    if "." not in clean:
        domain = f"https://{clean}.com"
    return domain


GROQ_TIMEOUT_SECONDS = 20
GROQ_MAX_RETRIES = 2


def _groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    return Groq(api_key=api_key, timeout=GROQ_TIMEOUT_SECONDS, max_retries=GROQ_MAX_RETRIES)


def _firecrawl_client() -> FirecrawlApp:
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        raise RuntimeError("FIRECRAWL_API_KEY is not set")
    return FirecrawlApp(api_key=api_key)


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group())
        raise ValueError("Model did not return valid JSON") from None


SCRAPE_TIMEOUT_SECONDS = 20
PRIORITY_PATH_KEYWORDS = ("career", "jobs", "about", "team", "pricing")
MAX_PAGES_TOTAL = 4
MAX_CHARS_PER_PAGE = 6000


def _single_page_markdown(app: "FirecrawlApp", url: str) -> str | None:
    try:
        result = app.scrape_url(
            url,
            params={"formats": ["markdown"], "timeout": SCRAPE_TIMEOUT_SECONDS * 1000},
        )
    except Exception:
        return None
    if not result or not isinstance(result, dict):
        return None
    if result.get("success") is False:
        return None
    data = result.get("data") or result
    if isinstance(data, dict):
        return data.get("markdown") or None
    if isinstance(data, str):
        return data
    return None


def _discover_priority_urls(app: "FirecrawlApp", base_url: str) -> list[str]:
    """Find up to MAX_PAGES_TOTAL-1 subpages likely to hold hiring/team/pricing signal."""
    try:
        mapped = app.map_url(base_url)
    except Exception:
        return []
    links: list[str] = []
    if isinstance(mapped, dict):
        links = mapped.get("links") or mapped.get("data") or []
    elif isinstance(mapped, list):
        links = mapped
    links = [l for l in links if isinstance(l, str)]

    picked: list[str] = []
    for keyword in PRIORITY_PATH_KEYWORDS:
        for link in links:
            if keyword in link.lower() and link not in picked:
                picked.append(link)
                break
        if len(picked) >= MAX_PAGES_TOTAL - 1:
            break
    return picked


def _scrape_domain(url: str) -> str:
    """Scrape the homepage plus up to 3 priority subpages (careers/about/pricing).
    Falls back gracefully: if subpage discovery or a subpage fetch fails, we still
    return whatever real content we did get, rather than aborting the whole scan."""
    app = _firecrawl_client()

    homepage_md = _single_page_markdown(app, url)
    if not homepage_md:
        raise RuntimeError("Firecrawl could not retrieve homepage content")

    pages = [homepage_md[:MAX_CHARS_PER_PAGE]]

    for subpage_url in _discover_priority_urls(app, url):
        sub_md = _single_page_markdown(app, subpage_url)
        if sub_md:
            pages.append(f"\n\n--- Page: {subpage_url} ---\n{sub_md[:MAX_CHARS_PER_PAGE]}")

    return "".join(pages)


TECH_SIGNATURES: dict[str, tuple[str, ...]] = {
    "HubSpot": ("hs-scripts.com", "hubspot.com/", "_hsq"),
    "Salesforce": ("force.com", "salesforce.com/", "pardot.com"),
    "Intercom": ("intercom.io", "widget.intercom"),
    "Segment": ("cdn.segment.com", "segment.io"),
    "Google Analytics": ("googletagmanager.com", "google-analytics.com"),
    "Stripe": ("js.stripe.com", "stripe.com/v3"),
    "Amplitude": ("amplitude.com", "cdn.amplitude"),
    "Mixpanel": ("mixpanel.com",),
    "Drift": ("drift.com",),
    "Marketo": ("marketo.com", "mktoresp.com"),
    "Zendesk": ("zdassets.com", "zendesk.com"),
    "Clay": ("clay.com", "clay.run"),
    "Apollo": ("apollo.io",),
    "Calendly": ("calendly.com",),
}


def _detect_tech_stack_from_html(raw_content: str) -> list[str]:
    """Real detection: scan scraped markdown/HTML for known vendor script domains.
    No paid API — just pattern matching on content we already fetched."""
    lower = raw_content.lower()
    found = []
    for tool, signatures in TECH_SIGNATURES.items():
        if any(sig in lower for sig in signatures):
            found.append(tool)
    return found


FUNDING_KEYWORDS = ("raises", "raised", "funding round", "series a", "series b",
                    "series c", "seed round", "seed funding", "closes round")


def _search_funding_news(app: "FirecrawlApp", company_name: str) -> dict[str, str]:
    """Real funding lookup: search public press coverage via Firecrawl's search,
    rather than inferring/guessing. Returns empty dict if nothing found — never fabricates."""
    try:
        results = app.search(f"{company_name} funding round raises million", limit=5)
    except Exception:
        return {}

    items = []
    if isinstance(results, dict):
        items = results.get("data") or results.get("results") or []
    elif isinstance(results, list):
        items = results

    for item in items:
        if not isinstance(item, dict):
            continue
        title = (item.get("title") or "") + " " + (item.get("description") or "")
        title_lower = title.lower()
        if any(k in title_lower for k in FUNDING_KEYWORDS):
            amount_match = re.search(r"\$[\d.]+\s?(million|billion|[mMbB])\b", title)
            round_match = re.search(r"(seed|series [a-d])", title_lower)
            return {
                "source_title": title.strip()[:200],
                "source_url": item.get("url", ""),
                "amount": amount_match.group(0) if amount_match else "",
                "round": round_match.group(0).title() if round_match else "",
            }
    return {}


def _detect_company_size(content: str, signals: str) -> str:
    content_lower = content.lower()
    signals_lower = signals.lower()
    if any(k in content_lower for k in ("series c", "series d", "ipo", "1000 employees", "10,000")):
        return "enterprise"
    if any(k in content_lower for k in ("series b", "500 employees", "global team", "100+ team")):
        return "scale"
    if any(k in content_lower for k in ("series a", "50 employees", "growing team", "hiring fast")):
        return "growth"
    if any(k in signals_lower for k in ("hiring", "recruiting", "seed", "pre-seed")):
        return "startup"
    return "startup"


def _get_dynamic_metrics(size: str) -> dict[str, str]:
    metrics = {
        "enterprise": {"humans": "8+ humans", "hours": "40h/week", "multiplier": "12"},
        "scale":      {"humans": "6 humans",   "hours": "35h/week", "multiplier": "9"},
        "growth":     {"humans": "4 humans",   "hours": "28h/week", "multiplier": "6"},
        "startup":    {"humans": "2 humans",   "hours": "18h/week", "multiplier": "4"},
    }
    return metrics.get(size, metrics["startup"])


def _get_structural_signal(profile: dict[str, str], content: str) -> str:
    signals = profile.get("signals", "").lower()
    pain = profile.get("pain", "").lower()
    stage = profile.get("stage", "").lower()
    content_lower = content.lower()

    if any(k in signals for k in ("hiring", "recruiting", "headcount", "team growth")):
        return "Scaling headcount to solve pipeline problems — infrastructure gap confirmed"
    if any(k in content_lower for k in ("agency", "outsource", "marketing partner", "retainer")):
        return "Agency dependency detected — zero institutional memory, high CAC"
    if any(k in pain for k in ("pipeline", "prospecting", "outbound", "leads")):
        return "Manual prospecting pattern — founder time misallocated to revenue ops"
    if any(k in pain for k in ("churn", "retention", "reactive", "inbound only")):
        return "Reactive GTM motion — no early signal detection or intent layer"
    if any(k in stage for k in ("seed", "pre-seed", "early")):
        return "Pre-infrastructure stage — acquisition running on founder relationships"
    if any(k in stage for k in ("growth", "series a", "series b")):
        return "Growth-stage dependency on manual sales — pipeline predictability at risk"
    if any(k in content_lower for k in ("sales team", "sdr", "bdm", "business development")):
        return "Human SDR dependency — high burn, zero compounding memory"
    return "Revenue infrastructure gap identified — acquisition not systemised"


def _generate_infrastructure_alerts(company_name: str, profile: dict[str, str], metrics: dict[str, str]) -> list[dict[str, str]]:
    """Build alerts strictly from evidence extracted by the model. No invented
    financial figures — if there's no real signal for a category, it's skipped."""
    alerts: list[dict[str, str]] = []

    hiring_roles = profile.get("hiring_roles") or []
    if hiring_roles:
        roles = ", ".join(hiring_roles[:3])
        alerts.append({
            "level": "critical",
            "text": f"Open GTM/sales roles detected: {roles}. Hiring to patch a pipeline gap manually.",
        })

    tech_stack = profile.get("tech_stack") or []
    sales_motion = profile.get("sales_motion", "")
    if tech_stack and sales_motion in ("outbound", "hybrid"):
        stack = ", ".join(tech_stack[:4])
        alerts.append({
            "level": "warning",
            "text": f"Sales stack in use ({stack}) with {sales_motion} motion — no evidence of an intent/signal layer feeding it.",
        })

    growth_indicators = profile.get("growth_indicators") or []
    if growth_indicators:
        alerts.append({
            "level": "warning",
            "text": f"Growth signal on record: {growth_indicators[0]}. No confirmation this is being acted on systematically.",
        })

    funding = profile.get("_funding") or {}
    if funding.get("round") or funding.get("amount"):
        parts = [p for p in (funding.get("round"), funding.get("amount")) if p]
        alerts.append({
            "level": "info",
            "text": f"Public funding signal: {' '.join(parts)} (source: press coverage).",
        })

    gap = profile.get("biggest_gap", "")
    if gap:
        alerts.append({
            "level": "critical" if profile.get("intervention_urgency") == "critical" else "warning",
            "text": f"Structural gap identified from site content: {gap}.",
        })

    if not alerts:
        alerts.append({
            "level": "info",
            "text": "No explicit GTM/hiring/funding signal found on the scanned pages. This reflects available public content, not company performance.",
        })

    return alerts


def _analyze_profile(domain: str, content: str) -> dict[str, Any]:
    client = _groq_client()
    truncated = content[:12000]

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a B2B revenue intelligence analyst specialising in identifying "
                    "sales infrastructure gaps for US and UK founders. "
                    "Extract deep sales intelligence from website content. "
                    "Respond only with valid JSON. All field values must be in English. "
                    "CRITICAL: Focus on revenue, sales, and GTM signals. "
                    "Look for: hiring pages, job listings, team size, funding, tech stack, "
                    "pricing model, sales motion, ICP signals, and growth indicators. "
                    "GROUND EVERY FIELD IN THE SUPPLIED CONTENT ONLY. If there is no real "
                    "evidence for a field (e.g. no hiring info visible, no funding mentioned), "
                    "return an empty string or empty list for it — do NOT invent or infer a "
                    "plausible-sounding value. Fabricated specifics are worse than an honest gap."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Domain: {domain}\n\n"
                    f"Website content:\n{truncated}\n\n"
                    "Return JSON with exactly these keys:\n"
                    '- "name": company name\n'
                    '- "product": one-sentence product description\n'
                    '- "icp": ideal customer profile (who they sell to)\n'
                    '- "stage": growth stage (seed/early/growth/scale/enterprise)\n'
                    '- "signals": SPECIFIC hiring, funding, or growth signals found in the content. '
                    'Examples: "Actively hiring 3 GTM roles", "Raised Series A $8M in 2024", '
                    '"Expanding to UK market". Return an empty string if none are present in the content.\n'
                    '- "pain": the single biggest revenue/pipeline challenge they face RIGHT NOW\n'
                    '- "angle": most compelling strategic intervention based on evidence\n'
                    '- "size": one of: startup/growth/scale/enterprise\n'
                    '- "tech_stack": list of sales/marketing tools detected (e.g. HubSpot, Salesforce, Apollo)\n'
                    '- "sales_motion": one of: inbound/outbound/PLG/channel/hybrid\n'
                    '- "revenue_model": one of: SaaS/transactional/marketplace/services/hybrid\n'
                    '- "hiring_roles": list of open sales/GTM roles detected (empty list if none)\n'
                    '- "growth_indicators": list of 2-3 specific growth signals from the site\n'
                    '- "biggest_gap": the single most critical revenue infrastructure gap\n'
                    '- "axon_fit": score 1-10 of how well AXON revenue infrastructure fits this company\n'
                    '- "intervention_urgency": one of: critical/high/medium/low\n'
                    '- "ceo_name": CEO or founder name if visible on site, else empty string\n'
                    '- "employee_count": estimated employee count as string (e.g. "50-100")\n'
                    '- "founded_year": founding year if visible, else empty string'
                ),
            },
        ],
    )

    raw = response.choices[0].message.content or ""
    data = _extract_json(raw)

    return {
        "name": str(data.get("name", domain)).strip(),
        "product": str(data.get("product", "Unknown")).strip(),
        "icp": str(data.get("icp", "Unknown")).strip(),
        "stage": str(data.get("stage", "")).strip(),
        "signals": str(data.get("signals", "")).strip(),
        "pain": str(data.get("pain", "")).strip(),
        "angle": str(data.get("angle", "")).strip(),
        "size": str(data.get("size", "startup")).strip(),
        "tech_stack": data.get("tech_stack", []),
        "sales_motion": str(data.get("sales_motion", "")).strip(),
        "revenue_model": str(data.get("revenue_model", "")).strip(),
        "hiring_roles": data.get("hiring_roles", []),
        "growth_indicators": data.get("growth_indicators", []),
        "biggest_gap": str(data.get("biggest_gap", "")).strip(),
        "axon_fit": int(data.get("axon_fit", 5)),
        "intervention_urgency": str(data.get("intervention_urgency", "medium")).strip(),
        "ceo_name": str(data.get("ceo_name", "")).strip(),
        "employee_count": str(data.get("employee_count", "")).strip(),
        "founded_year": str(data.get("founded_year", "")).strip(),
    }


def _generate_message(domain: str, profile: dict[str, Any], content: str) -> str:
    client = _groq_client()
    snippet = content[:4000]

    ceo_name = profile.get("ceo_name", "")
    greeting = f"Hey {ceo_name}" if ceo_name else "Hey"
    hiring = profile.get("hiring_roles", [])
    hiring_str = hiring[0] if hiring else profile.get("signals", "")
    gap = profile.get("biggest_gap", profile.get("pain", ""))

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        temperature=0.7,
        messages=[
            {
                "role": "system",
                "content": (
                    "You write short peer-to-peer strategic intervention messages in English. "
                    "Tone: direct, human, founder-to-founder — never salesy or pushy. "
                    "Length: 45-65 words exactly. "
                    "Open with ONE specific fact from their website — hiring signal, funding, or growth indicator. "
                    "Reference their biggest revenue gap specifically. "
                    'End exactly with: "When you\'re ready to make your pipeline predictable, the system is ready to deploy." '
                    "Return only the message text, no quotes or labels."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Domain: {domain}\n"
                    f"Company: {profile['name']}\n"
                    f"Product: {profile['product']}\n"
                    f"ICP: {profile['icp']}\n"
                    f"Stage: {profile['stage']}\n"
                    f"Key signal: {hiring_str}\n"
                    f"Biggest gap: {gap}\n"
                    f"Sales motion: {profile.get('sales_motion', 'hybrid')}\n"
                    f"Growth indicators: {', '.join(profile.get('growth_indicators', []))}\n\n"
                    f"Site excerpt:\n{snippet}"
                ),
            },
        ],
    )

    message = (response.choices[0].message.content or "").strip()
    closing = "When you're ready to make your pipeline predictable, the system is ready to deploy."
    if closing not in message:
        message = f"{message.rstrip('.')}. {closing}"
    return message


def _score_lead(profile: dict[str, Any]) -> tuple[Score, int]:
    signals = profile.get("signals", "").lower()
    stage = profile.get("stage", "").lower()
    pain = profile.get("pain", "").lower()
    axon_fit = int(profile.get("axon_fit", 5))
    urgency = profile.get("intervention_urgency", "medium").lower()
    hiring = profile.get("hiring_roles", [])

    score_num = 40

    # Axon fit score (1-10) mapped to 0-30 points
    score_num += axon_fit * 3

    # Urgency bonus
    if urgency == "critical": score_num += 20
    elif urgency == "high": score_num += 12
    elif urgency == "medium": score_num += 5

    # Hiring signals
    if hiring: score_num += 10
    if any(k in signals for k in ("hiring", "fund", "raised", "series", "recruit", "expanding")):
        score_num += 10

    # Stage fit
    if any(k in stage for k in ("growth", "scale", "series a", "series b")):
        score_num += 10
    elif any(k in stage for k in ("seed", "early")):
        score_num += 5

    # Pain relevance
    if any(k in pain for k in ("pipeline", "revenue", "sales", "acquisition", "cac", "churn")):
        score_num += 8

    # Enterprise penalty — too big for AXON
    if stage == "enterprise": score_num -= 20

    score_num = max(0, min(100, score_num))

    if score_num >= 75: return "HOT", score_num
    if score_num >= 55: return "WARM", score_num
    return "COLD", score_num


_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours


def run_scout(domain: str) -> dict[str, Any]:
    import time

    cache_key = domain.strip().lower()
    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]

    result = _run_scout_uncached(domain)
    _CACHE[cache_key] = (time.time(), result)
    return result


def _run_scout_uncached(domain: str) -> dict[str, Any]:
    import concurrent.futures

    bare = _bare_domain(domain)

    # Kick off the free, keyless signal calls in parallel with the main scrape/LLM
    # pipeline below — they're independent and shouldn't add sequential latency.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        age_future = pool.submit(get_domain_age, domain)
        speed_future = pool.submit(get_pagespeed_score, domain)

        url = _normalize_url(domain)
        content = _scrape_domain(url)
        profile = _analyze_profile(domain, content)

        # Override LLM-guessed tech_stack with real pattern-matched detection
        real_tech_stack = _detect_tech_stack_from_html(content)
        profile["tech_stack"] = real_tech_stack or []

        # Real funding lookup via public press search — empty dict if nothing found
        app = _firecrawl_client()
        funding = _search_funding_news(app, profile["name"])
        profile["_funding"] = funding

        structural_signal = _get_structural_signal(profile, content)
        size = profile.get("size") or _detect_company_size(content, profile.get("signals", ""))
        metrics = _get_dynamic_metrics(size)
        alerts = _generate_infrastructure_alerts(profile["name"], profile, metrics)
        message = _generate_message(domain, profile, content)
        score, score_num = _score_lead(profile)
        readiness_index = min(65, max(30, score_num - 10))

        domain_age = age_future.result(timeout=EXTERNAL_TIMEOUT + 1) if age_future else {}
        pagespeed = speed_future.result(timeout=EXTERNAL_TIMEOUT + 1) if speed_future else {}

    return {
        "domain": domain.strip(),
        "profile": profile,
        "message": message,
        "score": score,
        "score_num": score_num,
        "structural_signal": structural_signal,
        "infrastructure_alerts": alerts,
        "metrics": metrics,
        "readiness_index": readiness_index,
        "funding": funding,
        "logo_url": get_logo_url(domain),
        "domain_age": domain_age,
        "pagespeed": pagespeed,
    }
