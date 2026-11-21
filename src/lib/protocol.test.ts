import { describe, expect, it } from "vitest";
import { chatRequestSchema, federationMessageSchema } from "./protocol";

describe("chat request validation", () => {
  it("accepts a bounded broadcast request", () => {
    const result = chatRequestSchema.safeParse({
      message: "Review the investment assumptions",
      mode: "broadcast",
      agentIds: ["openai", "gemini"]
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty message", () => {
    const result = chatRequestSchema.safeParse({
      message: "  ",
      mode: "direct",
      agentIds: ["openai"]
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many agent targets", () => {
    const result = chatRequestSchema.safeParse({
      message: "Check this",
      mode: "broadcast",
      agentIds: ["a", "b", "c", "d", "e", "f", "g"]
    });
    expect(result.success).toBe(false);
  });
});

describe("federation envelope validation", () => {
  it("rejects a message that exceeds the hop limit", () => {
    const result = federationMessageSchema.safeParse({
      protocol_version: "1.0",
      message_id: "00000000-0000-4000-8000-000000000001",
      correlation_id: "00000000-0000-4000-8000-000000000002",
      conversation_id: "00000000-0000-4000-8000-000000000003",
      run_id: "00000000-0000-4000-8000-000000000004",
      sender: { type: "orchestrator", id: "ferguson" },
      recipient: { type: "agent", id: "gemini" },
      message_type: "task",
      created_at: "2026-01-01T00:00:00.000Z",
      content: { text: "Evaluate this task" },
      context: { source_message_ids: [], attachments: [] },
      policy: { classification: "internal", max_hops: 9, requires_human_approval: false }
    });
    expect(result.success).toBe(false);
  });
});