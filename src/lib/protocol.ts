import { z } from "zod";

export const federationMessageSchema = z.object({
  protocol_version: z.literal("1.0"),
  message_id: z.string().uuid(),
  correlation_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  run_id: z.string().uuid(),
  sender: z.object({
    type: z.enum(["human", "orchestrator", "agent"]),
    id: z.string().min(1).max(120)
  }),
  recipient: z.object({
    type: z.enum(["agent", "room"]),
    id: z.string().min(1).max(120)
  }),
  message_type: z.enum(["task", "response", "review", "status", "error"]),
  created_at: z.string().datetime(),
  content: z.object({ text: z.string().max(50000) }),
  context: z.object({
    source_message_ids: z.array(z.string().uuid()).max(100),
    attachments: z.array(z.object({
      id: z.string().min(1),
      media_type: z.string().max(120)
    })).max(20)
  }),
  policy: z.object({
    classification: z.enum(["public", "internal", "confidential"]),
    max_hops: z.number().int().min(0).max(5),
    requires_human_approval: z.boolean()
  })
});

export type FederationMessage = z.infer<typeof federationMessageSchema>;

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(12000),
  mode: z.enum(["direct", "broadcast", "sequential_review"]),
  agentIds: z.array(z.string().min(1).max(80)).min(1).max(6)
});