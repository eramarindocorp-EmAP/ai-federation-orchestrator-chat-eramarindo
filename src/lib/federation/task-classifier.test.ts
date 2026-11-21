import { describe, expect, it } from "vitest";
import { classifyFederationTask } from "./task-classifier";

describe("classifyFederationTask", () => {
  it("classifies software implementation requests", () => {
    expect(classifyFederationTask("Build a TypeScript API and add unit tests").category).toBe("coding");
  });

  it("classifies research requests", () => {
    expect(classifyFederationTask("Research providers and compare sources").category).toBe("research");
  });

  it("flags external side effects for human review", () => {
    const result = classifyFederationTask("Execute a production deploy now");
    expect(result.riskTier).toBe("high");
    expect(result.signals).toContain("external_side_effect_requested");
  });

  it("flags high-impact domains without authorizing them", () => {
    const result = classifyFederationTask("Provide an investment recommendation");
    expect(result.riskTier).toBe("high");
    expect(result.signals).toContain("high_impact_domain");
  });

  it("does not infer authority from credentials being mentioned", () => {
    const result = classifyFederationTask("Where should an API key be stored?");
    expect(result.riskTier).toBe("moderate");
    expect(result.signals).toContain("sensitive_credential_or_identity_data_mentioned");
  });

  it("defaults safely for ordinary requests", () => {
    expect(classifyFederationTask("Hello team").riskTier).toBe("low");
  });
});
