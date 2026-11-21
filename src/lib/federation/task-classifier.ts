export type TaskCategory =
  | "research"
  | "strategy"
  | "coding"
  | "data_analysis"
  | "writing"
  | "operations"
  | "general";

export type RiskTier = "low" | "moderate" | "high";

export type TaskClassification = {
  category: TaskCategory;
  riskTier: RiskTier;
  signals: string[];
  classifierVersion: "rules-v1";
};

/**
 * Deterministic, explainable routing metadata.
 * This classifier never grants permissions, selects providers, or authorizes actions.
 * High-impact requests are flagged for human review rather than executed automatically.
 */
export function classifyFederationTask(input: string): TaskClassification {
  const text = input.toLowerCase();
  const has = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));

  let category: TaskCategory = "general";
  if (has([/\b(code|coding|program|typescript|javascript|python|sql|api|debug|bug|repository|github|deploy|software|database)\b/])) {
    category = "coding";
  } else if (has([/\b(research|sources|citation|literature|benchmark|compare providers|market research)\b/])) {
    category = "research";
  } else if (has([/\b(strategy|strategic|roadmap|vision|mission|investment thesis|business model)\b/])) {
    category = "strategy";
  } else if (has([/\b(analyze|analysis|dataset|data|statistics|forecast|simulation|regression|kpi)\b/])) {
    category = "data_analysis";
  } else if (has([/\b(write|draft|rewrite|edit|polish|memo|proposal|presentation|report|translate)\b/])) {
    category = "writing";
  } else if (has([/\b(operations|sop|workflow|process|procurement|schedule|implementation|onboarding)\b/])) {
    category = "operations";
  }

  const signals: string[] = [];
  const asksForExternalAction = has([
    /\b(execute|transfer|pay|purchase|sign|submit|publish|send email|delete|drop table|production deploy)\b/
  ]);
  const regulatedOrHighImpact = has([
    /\b(diagnos(is|e)|prescri(be|ption)|medical treatment|legal advice|lawsuit|investment recommendation|buy or sell|securities order|loan approval|credit decision)\b/
  ]);
  const sensitiveData = has([
    /\b(password|api key|secret key|private key|access token|national id|passport number|bank account number)\b/
  ]);

  if (asksForExternalAction) signals.push("external_side_effect_requested");
  if (regulatedOrHighImpact) signals.push("high_impact_domain");
  if (sensitiveData) signals.push("sensitive_credential_or_identity_data_mentioned");

  const riskTier: RiskTier =
    asksForExternalAction || regulatedOrHighImpact ? "high" :
    sensitiveData ? "moderate" : "low";

  return { category, riskTier, signals, classifierVersion: "rules-v1" };
}
