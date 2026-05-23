// Scout API client — swap mockScout for the real endpoint when ready.
// Real endpoint (later): POST https://axon-scout.railway.app/scout { domain }

export interface ScoutProfile {
  name: string;
  product: string;
  icp: string;
  stage: string;
  signals: string;
  pain: string;
  angle: string;
}

export interface ScoutResult {
  domain: string;
  profile: ScoutProfile;
  message: string;
  score: "HOT" | "WARM" | "COLD";
  score_num: number;
}

export async function mockScout(company: string): Promise<ScoutResult> {
  await new Promise((r) => setTimeout(r, 3500));
  return {
    domain: company,
    profile: {
      name: company,
      product: "B2B SaaS platform",
      icp: "Growth-stage founders",
      stage: "growth",
      signals: "Hiring Head of Sales — posted 18 days ago",
      pain: "Inconsistent pipeline, agency dependency",
      angle:
        "Timing signal — sales hire means they're trying to solve this manually",
    },
    message: `Vi que a ${company} está a contratar um Head of Sales. Construí um sistema que torna esse processo 10× mais eficaz desde o dia 1 — detecta automaticamente quem está pronto para comprar antes de qualquer campanha. 3 minutos para experimentar?`,
    score: "HOT",
    score_num: 91,
  };
}

// Swap this to the real call when the endpoint is live:
// export async function scout(company: string): Promise<ScoutResult> {
//   const res = await fetch("https://axon-scout.railway.app/scout", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ domain: company }),
//   });
//   if (!res.ok) throw new Error("scout failed");
//   return res.json();
// }
export const runScout = mockScout;
