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
    multiplier = int(metrics.get("multiplier", "4"))
    agency_cost = multiplier * 800
    cost_per_signal = agency_cost // 2
    hours = metrics.get("hours", "18h/week").replace("h/week", "")
    deals_lost = max(2, multiplier // 2)
    cac_increase = 30 + (multiplier * 3)

    return [
        {"level": "critical", "text": f"Agency invoice: ${agency_cost:,}. Qualified acquisition signals delivered: {multiplier // 2}. Cost per signal: ${cost_per_signal:,}."},
        {"level": "critical", "text": f"CAC increased {cac_increase}% YoY at {company_name}. GTM team has no systemic explanation."},
        {"level": "warning",  "text": f"{deals_lost} deals lost to competitor who moved on intent signal first. No early warning system in place."},
        {"level": "warning",  "text": f"Founder spent {hours}h this week on revenue operations. Qualified meetings generated: 0."},
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
                    "You are a B2B revenue intelligence analyst specialising in identifying "
                    "sales infrastructure gaps for US and UK founders. "
                    "Extract deep sales intelligence from website content. "
                    "Respond only with valid JSON. All field values must be in English. "
                    "CRITICAL: Focus on revenue, sales, and GTM signals. "
                    "Look for: hiring pages, job listings, team size, funding, tech stack, "
                    "pricing model, sales motion, ICP signals, and growth indicators. "
                    "Never return 'none observed' for any field."
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
                    '- "signals": SPECIFIC hiring, funding, or growth signals. Examples: '
                    '"Actively hiring 3 GTM roles", "Raised Series A $8M in 2024", '
                    '"Expanding to UK market". NEVER say "none observed".\n'
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
        "stage": str(data.get("stage", "early")).strip(),
        "signals": str(data.get("signals", "Growth-stage GTM motion detected")).strip(),
        "pain": str(data.get("pain", "Pipeline predictability and revenue consistency")).strip(),
        "angle": str(data.get("angle", "Autonomous acquisition infrastructure deployment")).strip(),
        "size": str(data.get("size", "startup")).strip(),
        "tech_stack": data.get("tech_stack", []),
        "sales_motion": str(data.get("sales_motion", "hybrid")).strip(),
        "revenue_model": str(data.get("revenue_model", "SaaS")).strip(),
        "hiring_roles": data.get("hiring_roles", []),
        "growth_indicators": data.get("growth_indicators", []),
        "biggest_gap": str(data.get("biggest_gap", "Revenue infrastructure not systemised")).strip(),
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


def run_scout(domain: str) -> dict[str, Any]:
    url = _normalize_url(domain)
    content = _scrape_domain(url)
    profile = _analyze_profile(domain, content)

    structural_signal = _get_structural_signal(profile, content)
    size = profile.get("size") or _detect_company_size(content, profile.get("signals", ""))
    metrics = _get_dynamic_metrics(size)
    alerts = _generate_infrastructure_alerts(profile["name"], profile, metrics)
    message = _generate_message(domain, profile, content)
    score, score_num = _score_lead(profile)
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
