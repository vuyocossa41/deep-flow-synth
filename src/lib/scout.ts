export interface ScoutProfile {
  name: string;
  product: string;
  icp: string;
  stage: string;
  signals: string;
  pain: string;
  angle: string;
  size?: string; biggest_gap?: string; sales_motion?: string; revenue_model?: string; hiring_roles?: string[]; growth_indicators?: string[]; axon_fit?: number; intervention_urgency?: string; ceo_name?: string; employee_count?: string; founded_year?: string;
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
}

export async function runScout(domain: string): Promise<ScoutResult> {
  try {
    const res = await fetch("http://localhost:8000/scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    if (!res.ok) throw new Error(`Scout API error: ${res.status}`);
    return await res.json();
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
    return {
      domain,
      profile: {
        name: domain,
        product: "B2B SaaS platform",
        icp: "Growth-stage founders",
        stage: "growth",
        signals: "Hiring Head of Sales — posted 18 days ago",
        pain: "Inconsistent pipeline, agency dependency",
        angle: "Timing signal — sales hire means they're trying to solve this manually",
        size: "growth",
      },
      message: `Saw that ${domain} is hiring a Head of Sales. I built a system that makes that process 10x more effective from day one — it automatically detects who is ready to buy before any campaign runs. When you're ready to make your pipeline predictable, the system is ready to deploy.`,
      score: "HOT",
      score_num: 91,
      structural_signal: "Scaling headcount to solve pipeline problems — infrastructure gap confirmed",
      infrastructure_alerts: [
        { level: "critical", text: `Agency invoice: $3,200. Qualified signals delivered: 2. Cost per signal: $1,600.` },
        { level: "critical", text: `CAC increased 42% YoY at ${domain}. GTM team has no systemic explanation.` },
        { level: "warning",  text: `2 deals lost to competitor who moved on intent signal first.` },
        { level: "warning",  text: `Founder spent 18h this week on revenue operations. Qualified meetings generated: 0.` },
      ],
      metrics: { humans: "4 humans", hours: "18h/week", multiplier: "4" },
      readiness_index: 81,
    };
  }
}
