import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }),
  z.object({ action: z.literal("provider_test"), agentId: z.enum(["chatgpt-primary", "gemini-primary", "deepseek-primary"]) }),
  z.object({ action: z.literal("history"), conversationId: z.string().uuid() }),
  z.object({
    action: z.literal("chat"),
    clientMessageId: z.string().uuid(),
    message: z.string().trim().min(1).max(12000),
    mode: z.enum(["direct", "broadcast", "sequential_review"]),
    agentIds: z.array(z.enum(["chatgpt-primary", "gemini-primary", "deepseek-primary"])).min(1).max(3),
    conversationId: z.string().uuid().optional()
  })
]);

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer\s+\S+/i.test(authorization)) {
    return NextResponse.json({ status: "unauthorized", error: "Sign in is required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid_request", error: "The chat request is invalid or exceeds the allowed limits." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ status: "not_configured", error: "Supabase public application settings are not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const upstream = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/functions/v1/ai-federation-chat`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: publishableKey, authorization },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: controller.signal
    });
    const payload: unknown = await upstream.json().catch(() => ({
      status: "invalid_upstream_response",
      error: "The Federation service returned an unreadable response."
    }));
    return NextResponse.json(payload, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json({
      status: timedOut ? "upstream_timeout" : "upstream_unavailable",
      error: timedOut ? "The Federation service exceeded its request time limit." : "The Federation service could not be reached."
    }, { status: timedOut ? 504 : 502, headers: { "Cache-Control": "no-store" } });
  } finally {
    clearTimeout(timeout);
  }
}