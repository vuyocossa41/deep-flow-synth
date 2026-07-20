const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 20000;

async function groqChat(apiKey, messages, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_BASE + "/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: opts.temperature,
        messages: messages,
        response_format: opts.jsonMode ? { type: "json_object" } : undefined,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error("Groq API error " + res.status + ": " + body.slice(0, 300));
    }
    const data = await res.json();
    return data.choices[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Model did not return valid JSON");
  }
}

const PROFILE_SYSTEM_PROMPT = "You are a B2B revenue intelligence analyst specialising in identifying sales infrastructure gaps for US and UK founders. Extract deep sales intelligence from website content. Respond only with valid JSON. All field values must be in English. CRITICAL: Focus on revenue, sales, and GTM signals. Look for: hiring pages, job listings, team size, funding, tech stack, pricing model, sales motion, ICP signals, and growth indicators. GROUND EVERY FIELD IN THE SUPPLIED CONTENT ONLY. If there is no real evidence for a field, return an empty string or empty list for it, do NOT invent or infer a plausible-sounding value. Fabricated specifics are worse than an honest gap. CRITICAL FOR TEXT FIELDS (signals, pain, angle, biggest_gap): each must be ONE complete, grammatically correct English sentence, or an empty string. Never concatenate two unrelated facts into one field. Never truncate mid-word or mid-phrase. If two separate facts are worth mentioning, pick the single most important one and drop the rest rather than mashing them together.";

function profileUserPrompt(domain, truncated) {
  return "Domain: " + domain + "\n\nWebsite content:\n" + truncated + "\n\nReturn JSON with exactly these keys:\n- name: company name\n- product: one-sentence product description\n- icp: ideal customer profile\n- stage: growth stage (seed/early/growth/scale/enterprise)\n- signals: ONE complete, grammatically correct sentence describing the single most specific hiring, funding, or growth signal found in the content, empty string if none. Do not stitch multiple facts together.\n- pain: ONE complete sentence, the single biggest revenue/pipeline challenge right now\n- angle: ONE complete sentence, most compelling strategic intervention based on evidence\n- size: one of startup/growth/scale/enterprise\n- tech_stack: list of sales/marketing tools detected\n- sales_motion: one of inbound/outbound/PLG/channel/hybrid\n- revenue_model: one of SaaS/transactional/marketplace/services/hybrid\n- hiring_roles: list of open sales/GTM roles detected, empty list if none\n- growth_indicators: list of 2-3 specific growth signals from the site, each ONE complete sentence\n- biggest_gap: ONE complete sentence, the single most critical revenue infrastructure gap\n- axon_fit: score 1-10 of fit\n- intervention_urgency: one of critical/high/medium/low\n- ceo_name: CEO or founder name if visible, else empty string\n- employee_count: estimated employee count as string\n- founded_year: founding year if visible, else empty string";
}

export async function analyzeProfile(apiKey, domain, content) {
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

const MESSAGE_SYSTEM_PROMPT = "You write short peer-to-peer strategic intervention messages in English. Tone: direct, human, founder-to-founder, never salesy or pushy. Length: 45-65 words exactly. Open with ONE specific fact from their website. Reference their biggest revenue gap specifically. End exactly with: When you're ready to make your pipeline predictable, the system is ready to deploy. Return only the message text, no quotes or labels.";

export async function generateMessage(apiKey, domain, profile, content) {
  const snippet = content.slice(0, 4000);
  const greeting = profile.ceo_name ? "Hey " + profile.ceo_name : "Hey";
  const hiringStr = profile.hiring_roles[0] ?? profile.signals;
  const gap = profile.biggest_gap || profile.pain;

  const userContent = "Domain: " + domain + "\nCompany: " + profile.name + "\nProduct: " + profile.product + "\nICP: " + profile.icp + "\nStage: " + profile.stage + "\nKey signal: " + hiringStr + "\nBiggest gap: " + gap + "\nSales motion: " + (profile.sales_motion || "hybrid") + "\nGrowth indicators: " + profile.growth_indicators.join(", ") + "\n\nSite excerpt:\n" + snippet;

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
    message = message.replace(/\.+$/, "") + ". " + closing;
  }
  void greeting;
  return message;
}
