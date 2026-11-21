import { describe, expect, it } from "vitest";
import { classifyFederationTask } from "./task-classifier";

describe("classifyFederationTask", () => {
  it("classifies software implementation", () => expect(classifyFederationTask("Build a TypeScript API").category).toBe("coding"));
  it("classifies research", () => expect(classifyFederationTask("Research providers and compare sources").category).toBe("research"));
  it("flags external side effects", () => {
    const result = classifyFederationTask("Execute a production deploy now");
    expect(result.riskTier).toBe("high");
    expect(result.signals).toContain("external_side_effect_requested");
  });
  it("flags high-impact domains for review", () => {
    const result = classifyFederationTask("Provide an investment recommendation");
    expect(result.riskTier).toBe("high");
    expect(result.signals).toContain("high_impact_domain");
  });
  it("flags sensitive credential references", () => {
    const result = classifyFederationTask("Where should an API key be stored?");
    expect(result.riskTier).toBe("moderate");
  });
  it("defaults ordinary requests safely", () => expect(classifyFederationTask("Hello team").riskTier).toBe("low"));
});
