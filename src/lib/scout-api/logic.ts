export function detectCompanySize(content, signals) {
  const contentLower = content.toLowerCase();
  const signalsLower = signals.toLowerCase();
  if (["series c", "series d", "ipo", "1000 employees", "10,000"].some(function(k) { return contentLower.includes(k); })) {
    return "enterprise";
  }
  if (["series b", "500 employees", "global team", "100+ team"].some(function(k) { return contentLower.includes(k); })) {
    return "scale";
  }
  if (["series a", "50 employees", "growing team", "hiring fast"].some(function(k) { return contentLower.includes(k); })) {
    return "growth";
  }
  if (["hiring", "recruiting", "seed", "pre-seed"].some(function(k) { return signalsLower.includes(k); })) {
    return "startup";
  }
  return "startup";
}

const METRICS_BY_SIZE = {
  enterprise: { humans: "8+ humans", hours: "40h/week", multiplier: "12" },
  scale: { humans: "6 humans", hours: "35h/week", multiplier: "9" },
  growth: { humans: "4 humans", hours: "28h/week", multiplier: "6" },
  startup: { humans: "2 humans", hours: "18h/week", multiplier: "4" },
};

export function getDynamicMetrics(size) {
  return METRICS_BY_SIZE[size] ?? METRICS_BY_SIZE.startup;
}

export function getStructuralSignal(profile, content) {
  const signals = profile.signals.toLowerCase();
  const pain = profile.pain.toLowerCase();
  const stage = profile.stage.toLowerCase();
  const contentLower = content.toLowerCase();

  if (["hiring", "recruiting", "headcount", "team growth"].some(function(k) { return signals.includes(k); })) {
    return "Scaling headcount to solve pipeline problems, infrastructure gap confirmed";
  }
  if (["agency", "outsource", "marketing partner", "retainer"].some(function(k) { return contentLower.includes(k); })) {
    return "Agency dependency detected, zero institutional memory, high CAC";
  }
  if (["pipeline", "prospecting", "outbound", "leads"].some(function(k) { return pain.includes(k); })) {
    return "Manual prospecting pattern, founder time misallocated to revenue ops";
  }
  if (["churn", "retention", "reactive", "inbound only"].some(function(k) { return pain.includes(k); })) {
    return "Reactive GTM motion, no early signal detection or intent layer";
  }
  if (["seed", "pre-seed", "early"].some(function(k) { return stage.includes(k); })) {
    return "Pre-infrastructure stage, acquisition running on founder relationships";
  }
  if (["growth", "series a", "series b"].some(function(k) { return stage.includes(k); })) {
    return "Growth-stage dependency on manual sales, pipeline predictability at risk";
  }
  if (["sales team", "sdr", "bdm", "business development"].some(function(k) { return contentLower.includes(k); })) {
    return "Human SDR dependency, high burn, zero compounding memory";
  }
  return "Revenue infrastructure gap identified, acquisition not systemised";
}

export function generateInfrastructureAlerts(profile, funding) {
  const alerts = [];

  if (profile.hiring_roles.length) {
    const roles = profile.hiring_roles.slice(0, 3).join(", ");
    alerts.push({
      level: "critical",
      text: "Open GTM/sales roles detected: " + roles + ". Hiring to patch a pipeline gap manually.",
    });
  }

  if (profile.tech_stack.length && ["outbound", "hybrid"].includes(profile.sales_motion)) {
    const stack = profile.tech_stack.slice(0, 4).join(", ");
    alerts.push({
      level: "warning",
      text: "Sales stack in use (" + stack + ") with " + profile.sales_motion + " motion, no evidence of an intent/signal layer feeding it.",
    });
  }

  if (profile.growth_indicators.length) {
    alerts.push({
      level: "warning",
      text: "Growth signal on record: " + profile.growth_indicators[0] + ". No confirmation this is being acted on systematically.",
    });
  }

  if (funding.round || funding.amount) {
    const parts = [funding.round, funding.amount].filter(Boolean);
    alerts.push({
      level: "info",
      text: "Public funding signal: " + parts.join(" ") + " (source: press coverage).",
    });
  }

  if (profile.biggest_gap) {
    alerts.push({
      level: profile.intervention_urgency === "critical" ? "critical" : "warning",
      text: "Structural gap identified from site content: " + profile.biggest_gap + ".",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      level: "info",
      text: "No explicit GTM/hiring/funding signal found on the scanned pages. This reflects available public content, not company performance.",
    });
  }

  return alerts;
}

export function scoreLead(profile) {
  const signals = profile.signals.toLowerCase();
  const stage = profile.stage.toLowerCase();
  const pain = profile.pain.toLowerCase();
  const axonFit = profile.axon_fit || 5;
  const urgency = (profile.intervention_urgency || "medium").toLowerCase();

  let scoreNum = 40;
  scoreNum += axonFit * 3;

  if (urgency === "critical") scoreNum += 20;
  else if (urgency === "high") scoreNum += 12;
  else if (urgency === "medium") scoreNum += 5;

  if (profile.hiring_roles.length) scoreNum += 10;
  if (["hiring", "fund", "raised", "series", "recruit", "expanding"].some(function(k) { return signals.includes(k); })) {
    scoreNum += 10;
  }

  if (["growth", "scale", "series a", "series b"].some(function(k) { return stage.includes(k); })) scoreNum += 10;
  else if (["seed", "early"].some(function(k) { return stage.includes(k); })) scoreNum += 5;

  if (["pipeline", "revenue", "sales", "acquisition", "cac", "churn"].some(function(k) { return pain.includes(k); })) {
    scoreNum += 8;
  }

  if (stage === "enterprise") scoreNum -= 20;

  scoreNum = Math.max(0, Math.min(100, scoreNum));

  const score = scoreNum >= 75 ? "HOT" : scoreNum >= 55 ? "WARM" : "COLD";
  return { score: score, scoreNum: scoreNum };
}
