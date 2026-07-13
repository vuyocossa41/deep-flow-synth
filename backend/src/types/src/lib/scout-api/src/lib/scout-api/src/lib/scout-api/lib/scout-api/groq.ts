// Groq integration — direct TS port of backend/scout_agent.py's
// _analyze_profile and _generate_message. Preserves the anti-fabrication
// rule word-for-word: empty/missing evidence must produce empty fields,
// never a plausible-sounding invented value.

const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 20000;

async function groqChat(apiKey: string, messages: { role: string; content: string }[], opts: {
  temperature: number;
  jsonMode?: boolean;
}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: opts.temperature,
        messages,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Groq API error ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(text: string): Record<string, any> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Model did not return valid JSON");
  }
}

export interface ScoutProfile {
  name: string;
  product: string;
  icp: string;
  stage: string;
  signals: string;
  pain: string;
  angle: string;
  size: string;
  tech_stack: string[];
  sales_motion: string;
  revenue_model: string;
  hiring_roles: string[];
  growth_indicators: string[];
  biggest_gap: string;
  axon_fit: number;
  intervention_urgency: string;
  ceo_name: string;
  employee_count: string;
  founded_year: string;
}

const PROFILE_SYSTEM_PROMPT = `You are a B2B revenue intelligence analyst specialising in identifying sales infrastructure gaps for US and UK founders. Extract deep sales intelligence from website content. Respond only with valid JSON. All field values must be in English. CRITICAL: Focus on revenue, sales, and GTM signals. Look for: hiring pages, job listings, team size, funding, tech stack, pricing model, sales motion, ICP signals, and growth indicators. GROUND EVERY FIELD IN THE SUPPLIED CONTENT ONLY. If there is no real evidence for a field (e.g. no hiring info visible, no funding mentioned), return an empty string or empty list for it — do NOT invent or infer a plausible-sounding value. Fabricated specifics are worse than an honest gap.`;

function profileUserPrompt(domain: string, truncated: string): string {
  return `Domain: ${domain}

Website content:
${truncated}

Return JSON with exactly these keys:
- "name": company name
- "product": one-sentence product description
- "icp": ideal customer profile (who they sell to)
- "stage": growth stage (seed/early/growth/scale/enterprise)
- "signals": SPECIFIC hiring, funding, or growth signals found in the content. Examples: "Actively hiring 3 GTM roles", "Raised Series A $8M in 2024", "Expanding to UK market". Return an empty string if none are present in the content.
- "pain": the single biggest revenue/pipeline challenge they face RIGHT NOW
- "angle": most compelling strategic intervention based on evidence
- "size": one of: startup/growth/scale/enterprise
- "tech_stack": list of sales/marketing tools detected (e.g. HubSpot, Salesforce, Apollo)
- "sales_motion": one of: inbound/outbound/PLG/channel/hybrid
- "revenue_model": one of: SaaS/transactional/marketplace/services/hybrid
- "hiring_roles": list of open sales/GTM roles detected (empty list if none)
- "growth_indicators": list of 2-3 specific growth signals from the site
- "biggest_gap": the single most critical revenue infrastructure gap
- "axon_fit": score 1-10 of how well AXON revenue infrastructure fits this company
- "intervention_urgency": one of: critical/high/medium/low
- "ceo_name": CEO or founder name if visible on site, else empty string
- "employee_count": estimated employee count as string (e.g. "50-100")
- "founded_year": founding year if visible, else empty string`;
}

export async function analyzeProfile(apiKey: string, domain: string, content: string): Promise<ScoutProfile> {
  const truncated = content.slice(0, 12000);
  const raw = await groqChat(
    apiKey,
    [
      { role: "system", content: PROFILE_SYSTEM_PROMPT },
      { role: "user", content: profileUserPrompt(domain, truncated) },
    ],
    { temperature: 0.2, jsonMode: true },
  );
  const data = extractJson(raw);

  return {
    name: String(data.name ?? domain).trim(),
    product: String(data.product ?? "Unknown").trim(),
    icp: String(data.icp ?? "Unknown").trim(),
    stage: String(data.stage ?? "").trim(),
    signals: String(data.signals ?? "").trim(),
    pain: String(data.pain ?? "").trim(),
    angle: String(data.angle ?? "").trim(),
    size: String(data.size ?? "startup").trim(),
    tech_stack: Array.isArray(data.tech_stack) ? data.tech_stack : [],
    sales_motion: String(data.sales_motion ?? "").trim(),
    revenue_model: String(data.revenue_model ?? "").trim(),
    hiring_roles: Array.isArray(data.hiring_roles) ? data.hiring_roles : [],
    growth_indicators: Array.isArray(data.growth_indicators) ? data.growth_indicators : [],
    biggest_gap: String(data.biggest_gap ?? "").trim(),
    axon_fit: Number(data.axon_fit ?? 5),
    intervention_urgency: String(data.intervention_urgency ?? "medium").trim(),
    ceo_name: String(data.ceo_name ?? "").trim(),
    employee_count: String(data.employee_count ?? "").trim(),
    founded_year: String(data.founded_year ?? "").trim(),
  };
}

const MESSAGE_SYSTEM_PROMPT = `You write short peer-to-peer strategic intervention messages in English. Tone: direct, human, founder-to-founder — never salesy or pushy. Length: 45-65 words exactly. Open with ONE specific fact from their website — hiring signal, funding, or growth indicator. Reference their biggest revenue gap specifically. End exactly with: "When you're ready to make your pipeline predictable, the system is ready to deploy." Return only the message text, no quotes or labels.`;

export async function generateMessage(apiKey: string, domain: string, profile: ScoutProfile, content: string): Promise<string> {
  const snippet = content.slice(0, 4000);
  const greeting = profile.ceo_name ? `Hey ${profile.ceo_name}` : "Hey";
  const hiringStr = profile.hiring_roles[0] ?? profile.signals;
  const gap = profile.biggest_gap || profile.pain;

  const userContent = `Domain: ${domain}
Company: ${profile.name}
Product: ${profile.product}
ICP: ${profile.icp}
Stage: ${profile.stage}
Key signal: ${hiringStr}
Biggest gap: ${gap}
Sales motion: ${profile.sales_motion || "hybrid"}
Growth indicators: ${profile.growth_indicators.join(", ")}

Site excerpt:
${snippet}`;

  const raw = await groqChat(
    apiKey,
    [
      { role: "system", content: MESSAGE_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    { temperature: 0.7 },
  );

  let message = raw.trim();
  const closing = "When you're ready to make your pipeline predictable, the system is ready to deploy.";
  if (!message.includes(closing)) {
    message = `${message.replace(/\.+$/, "")}. ${closing}`;
  }
  // greeting is referenced in the Python version for parity/documentation of intent;
  // the model is instructed to open with a fact, not necessarily the literal greeting.
  void greeting;
  return message;
}
