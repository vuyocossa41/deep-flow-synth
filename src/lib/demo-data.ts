// Generate deterministic-yet-varied demo data from a company name.
// Same name => same numbers. Different name => different story.

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export interface DemoData {
  company: string;
  ceo: string;
  industry: string;
  fundingAmount: string;
  fundingRound: string;
  fundingDays: number;
  hiringRole: string;
  ceoQuote: string;
  icpScore: number;
  buySignal: string;
  priority: string;
  mrr: number;
  mrrDelta: number;
  runwayMonths: number;
  churnClients: { name: string; risk: number; mrr: number; reason: string }[];
  burnDelta: number;
  upsellCount: number;
  mrrTrend: number[];
  pipelineTrend: number[];
  cashTrend: number[];
  reasoning: string[];
  conclusion: string;
  annualSaving: number;
  meetingsBookedPerWeek: number;
  message: string;
  competitorMoves: string[];
  // Intelligence Layer
  intel: {
    category: string;
    positioning: string;
    pricingTier: string;
    pricingNote: string;
    icpDescriptor: string;
    competitors: string[];
    differentiators: string[];
  };
}

const industries = ["SaaS", "DevTools", "FinTech", "AI Infra", "Vertical SaaS"];
const ceoFirsts = ["Alex", "Sam", "Jordan", "Priya", "Marco", "Lena", "Diego", "Yuki"];
const hires = ["VP of Sales", "Head of GTM", "Director of Revenue", "VP Marketing", "Chief Revenue Officer"];
const rounds = ["Seed extension", "Series A", "Series A extension", "Series B"];
const quotes = [
  "need to scale pipeline fast",
  "we're hiring our first sales team",
  "autonomous acquisition is the gap right now",
  "ramping up GTM next quarter",
  "looking for repeatable acquisition",
];
const churnReasons = [
  "no logins last 14 days",
  "downgraded seats 2x in 60d",
  "support tickets up 340%",
  "champion left the company",
  "feature usage down 62%",
];
const churnNames = ["Northwind", "TechCorp", "Quantica", "Helio Labs", "Pinecrest", "Vertex IO", "Lumen AI"];
const competitorList = [
  "Competitor launched AI mode last week",
  "Rival raised Series B yesterday",
  "Adjacent player pivoting into your ICP",
  "Open-source alt hit 12k stars this month",
];

function trend(seed: number, base: number, len = 24, vol = 0.08): number[] {
  const out: number[] = [];
  let v = base * 0.6;
  for (let i = 0; i < len; i++) {
    const noise = ((((seed + i * 977) % 1000) / 1000) - 0.5) * 2 * vol;
    const growth = (i / len) * (base * 0.55);
    v = base * 0.6 + growth + base * noise;
    out.push(Math.max(0, Math.round(v)));
  }
  out[len - 1] = base;
  return out;
}

export function generateDemoData(rawCompany: string): DemoData {
  const company = rawCompany.trim() || "Acme";
  const s = hash(company.toLowerCase());

  const ceoFirst = pick(ceoFirsts, s);
  const industry = pick(industries, s >> 3);
  const fundingDays = 1 + (s % 7);
  const fundingAmount = `$${2 + (s % 12)}M`;
  const fundingRound = pick(rounds, s >> 5);
  const hiringRole = pick(hires, s >> 7);
  const ceoQuote = pick(quotes, s >> 9);

  const icpScore = 82 + (s % 16);
  const mrr = 18000 + (s % 70) * 800;
  const mrrDelta = 6 + (s % 14);
  const runwayMonths = 9 + (s % 12);
  const burnDelta = 1 + (s % 5);
  const upsellCount = 3 + (s % 6);

  const numChurn = 2 + (s % 2);
  const churnClients = Array.from({ length: numChurn }).map((_, i) => ({
    name: pick(churnNames, s + i * 31),
    risk: 72 + ((s + i * 17) % 25),
    mrr: 1200 + ((s + i * 11) % 40) * 80,
    reason: pick(churnReasons, s + i * 7),
  }));

  const mrrTrend = trend(s, mrr, 24, 0.05);
  const pipelineTrend = trend(s >> 2, 100 + (s % 80), 24, 0.18);
  const cashTrend = trend(s >> 4, runwayMonths, 24, 0.04).map((v) =>
    Math.max(4, v),
  );

  const reasoning = [
    `${fundingRound} ${fundingAmount} closed ${fundingDays}d ago`,
    `Hiring ${hiringRole} → revenue gap signal`,
    `CEO mentioned pipeline ${1 + (s % 3) + 1}x in 14d`,
    `Burn multiple elevated (${(1.4 + (s % 6) / 10).toFixed(1)}x)`,
    `Acquisition velocity below ICP benchmark`,
  ];
  const conclusion = "High acquisition readiness · Deploy intervention within 48h";

  const competitorMoves = [pick(competitorList, s), pick(competitorList, s >> 6)];

  const annualSaving = 110000 + (s % 60) * 1000;
  const meetingsBookedPerWeek = 2 + (s % 3);

  const message = `Hey ${ceoFirst}, saw the ${fundingRound} ${fundingDays} days ago — congrats.

With ${hiringRole} ramping and "${ceoQuote}" on your mind, the next 90 days are pipeline-defining.

I built something specific for this moment — would you be open to a 22-min conversation this week?`;

  return {
    company,
    ceo: ceoFirst,
    industry,
    fundingAmount,
    fundingRound,
    fundingDays,
    hiringRole,
    ceoQuote,
    icpScore,
    buySignal: "ACTIVE",
    priority: "HIGH",
    mrr,
    mrrDelta,
    runwayMonths,
    churnClients,
    burnDelta,
    upsellCount,
    mrrTrend,
    pipelineTrend,
    cashTrend,
    reasoning,
    conclusion,
    annualSaving,
    meetingsBookedPerWeek,
    message,
    competitorMoves,
    intel: {
      category: `${industry} · Revenue Infrastructure`,
      positioning: `Autonomous GTM operating system for ${industry} scale-ups`,
      pricingTier: pick(["Mid-market", "Enterprise", "Growth"], s >> 11),
      pricingNote: `$${20 + (s % 60)}k–$${120 + (s % 80)}k ACV band`,
      icpDescriptor: `Post-${fundingRound.toLowerCase()} ${industry} teams, 20–250 FTE, hiring GTM`,
      competitors: [
        pick(["Apollo.io", "Outreach", "Salesloft", "Clay"], s),
        pick(["Gong", "Common Room", "UserGems", "Pocus"], s >> 2),
        pick(["6sense", "Demandbase", "Koala", "RB2B"], s >> 4),
      ],
      differentiators: [
        "Autonomous infrastructure orchestration vs single-system point solutions",
        "Reasoning trace exposed to operator",
        "Closed-loop: signal → message → revenue attribution",
      ],
    },
  };
}
