import json
import os
import re
from typing import Any, Literal

from dotenv import load_dotenv
from firecrawl import FirecrawlApp
from groq import Groq

load_dotenv()

GROQ_MODEL = "llama-3.3-70b-versatile"
Score = Literal["HOT", "WARM", "COLD"]


def _normalize_url(domain: str) -> str:
    domain = domain.strip()
    if not domain:
        raise ValueError("Domain cannot be empty")
    if not domain.startswith(("http://", "https://")):
        domain = f"https://{domain}"
    # ensure valid TLD
    clean = domain.replace("https://", "").replace("http://", "")
    if "." not in clean:
        domain = f"https://{clean}.com"
    return domain


def _groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    return Groq(api_key=api_key)


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


def _scrape_domain(url: str) -> str:
    app = _firecrawl_client()
    result = app.scrape_url(url, params={"formats": ["markdown"]})

    if not result:
        raise RuntimeError("Firecrawl returned no data")

    if isinstance(result, dict):
        if result.get("success") is False:
            raise RuntimeError(result.get("error", "Firecrawl scrape failed"))
        data = result.get("data") or result
        markdown = data.get("markdown") if isinstance(data, dict) else None
        if markdown:
            return markdown
        if isinstance(data, str):
            return data

    raise RuntimeError("Could not extract markdown content from scrape")


def _detect_company_size(content: str, signals: str) -> str:
    """Detect company size from content for dynamic metrics."""
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
    """Return dynamic chaos metrics based on company size."""
    metrics = {
        "enterprise": {"humans": "8+ humans", "hours": "40h/week", "multiplier": "12"},
        "scale":      {"humans": "6 humans",   "hours": "35h/week", "multiplier": "9"},
        "growth":     {"humans": "4 humans",   "hours": "28h/week", "multiplier": "6"},
        "startup":    {"humans": "2 humans",   "hours": "18h/week", "multiplier": "4"},
    }
    return metrics.get(size, metrics["startup"])


def _get_structural_signal(profile: dict[str, str], content: str) -> str:
    """
    Always returns a specific structural signal — never 'None observed'.
    Maps signals/pain/stage to a concrete infrastructure gap.
    """
    signals = profile.get("signals", "").lower()
    pain = profile.get("pain", "").lower()
    stage = profile.get("stage", "").lower()
    content_lower = content.lower()

    # Priority order — first match wins
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
        return "Human SDR dependency — €3-8k/month burn, zero compounding memory"

    # Absolute fallback — never empty
    return "Revenue infrastructure gap identified — acquisition not systemised"


def _generate_infrastructure_alerts(company_name: str, profile: dict[str, str], metrics: dict[str, str]) -> list[dict[str, str]]:
    """Generate 4 specific infrastructure alerts using company name and metrics."""
    multiplier = int(metrics.get("multiplier", "4"))
    agency_cost = multiplier * 800
    cost_per_signal = agency_cost // 2
    hours = metrics.get("hours", "18h/week").replace("h/week", "")
    deals_lost = max(2, multiplier // 2)
    cac_increase = 30 + (multiplier * 3)

    return [
        {
            "level": "critical",
            "text": f"Agency invoice: ${agency_cost:,}. Qualified acquisition signals delivered: {multiplier // 2}. Cost per signal: ${cost_per_signal:,}."
        },
        {
            "level": "critical",
            "text": f"CAC increased {cac_increase}% YoY at {company_name}. GTM team has no systemic explanation."
        },
        {
            "level": "warning",
            "text": f"{deals_lost} deals lost to competitor who moved on intent signal first. No early warning system in place."
        },
        {
            "level": "warning",
            "text": f"Founder spent {hours}h this week on revenue operations. Qualified meetings generated: 0."
        },
    ]


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
                    "You are a B2B sales intelligence analyst for US and UK founders. "
                    "Extract structured company intelligence from website content. "
                    "Respond only with valid JSON. All field values must be in English. "
                    "CRITICAL: For the 'signals' field, you MUST identify something specific — "
                    "look for hiring pages, job listings, team size mentions, funding announcements, "
                    "recent launches, or growth indicators. Never return 'none observed' — "
                    "if no hiring/funding signals exist, describe the company's growth motion instead."
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
                    '- "stage": growth stage (seed / early / growth / scale / enterprise)\n'
                    '- "signals": SPECIFIC hiring, funding, or growth signals from the site. '
                    '  Examples: "Actively hiring 3 GTM roles", "Raised Series A in 2024", '
                    '  "Expanding to UK market", "Scaling sales team". NEVER say "none observed".\n'
                    '- "pain": the single biggest revenue/pipeline challenge they likely face right now\n'
                    '- "angle": the most compelling strategic intervention angle based on site evidence\n'
                    '- "size": one of: startup / growth / scale / enterprise'
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
        "stage": str(data.get("stage", "early")).strip(),
        "signals": str(data.get("signals", "Growth-stage GTM motion detected")).strip(),
        "pain": str(data.get("pain", "Pipeline predictability and revenue consistency")).strip(),
        "angle": str(data.get("angle", "Autonomous acquisition infrastructure deployment")).strip(),
        "size": str(data.get("size", "startup")).strip(),
    }


def _generate_message(domain: str, profile: dict[str, str], content: str) -> str:
    client = _groq_client()
    snippet = content[:4000]

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        temperature=0.7,
        messages=[
            {
                "role": "system",
                "content": (
                    "You write short peer-to-peer strategic intervention messages in English (US/UK). "
                    "Tone: direct, human, strategic — never salesy or pushy. "
                    "Length: 45-65 words. "
                    "Open with one specific fact from their website. "
                    'End exactly with: "When you\'re ready to make your pipeline predictable, the system is ready to deploy." '
                    'Do NOT mention "3 minutes" or similar time hooks. '
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
                    f"Signals: {profile['signals']}\n"
                    f"Pain: {profile['pain']}\n"
                    f"Angle: {profile['angle']}\n\n"
                    f"Site excerpt:\n{snippet}"
                ),
            },
        ],
    )

    message = (response.choices[0].message.content or "").strip()
    closing = "When you're ready to make your pipeline predictable, the system is ready to deploy."
    if closing not in message:
        message = f"{message.rstrip('.')} {closing}"
    return message


def _score_lead(profile: dict[str, str]) -> tuple[Score, int]:
    signals = profile.get("signals", "").lower()
    stage = profile.get("stage", "").lower()
    pain = profile.get("pain", "").lower()

    score_num = 50

    if any(k in signals for k in ("hiring", "fund", "raised", "series", "recruit", "expanding", "scaling")):
        score_num += 25
    if any(k in stage for k in ("growth", "scale", "series b", "series c")):
        score_num += 15
    if any(k in pain for k in ("pipeline", "revenue", "sales", "churn", "cac", "growth", "acquisition")):
        score_num += 10
    if "none observed" in signals:
        score_num -= 10

    score_num = max(0, min(100, score_num))

    if score_num >= 75:
        return "HOT", score_num
    if score_num >= 55:
        return "WARM", score_num
    return "COLD", score_num


def run_scout(domain: str) -> dict[str, Any]:
    url = _normalize_url(domain)
    content = _scrape_domain(url)
    profile = _analyze_profile(domain, content)

    # Generate structural signal — never empty
    structural_signal = _get_structural_signal(profile, content)

    # Detect size and get dynamic metrics
    size = profile.get("size") or _detect_company_size(content, profile.get("signals", ""))
    metrics = _get_dynamic_metrics(size)

    # Generate infrastructure alerts with company name
    alerts = _generate_infrastructure_alerts(profile["name"], profile, metrics)

    message = _generate_message(domain, profile, content)
    score, score_num = _score_lead(profile)

    # Acquisition readiness index — never static 45%
    readiness_index = min(65, max(30, score_num - 10))

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
    }