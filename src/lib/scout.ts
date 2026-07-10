export interface ScoutProfile {
  name: string;
  product: string;
  icp: string;
  stage: string;
  signals: string;
  pain: string;
  angle: string;
  size?: string; biggest_gap?: string; sales_motion?: string; revenue_model?: string; hiring_roles?: string[]; growth_indicators?: string[]; axon_fit?: number; intervention_urgency?: string; ceo_name?: string; employee_count?: string; founded_year?: string;
  tech_stack?: string[];
}

export interface ScoutFunding {
  source_title?: string;
  source_url?: string;
  amount?: string;
  round?: string;
}

export interface ScoutResult {
  domain: string;
  profile: ScoutProfile;
  message: string;
  score: "HOT" | "WARM" | "COLD";
  score_num: number;
  structural_signal?: string;
  infrastructure_alerts?: { level: string; text: string }[];
  metrics?: { humans: string; hours: string; multiplier: string };
  readiness_index?: number;
  funding?: ScoutFunding;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function runScout(domain: string): Promise<ScoutResult> {
  const res = await fetch(`${API_URL}/scout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : `Scout failed (${res.status})`;
    throw new Error(detail);
  }

  return data as ScoutResult;
}
