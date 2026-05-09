import Anthropic from "@anthropic-ai/sdk";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

let client: Anthropic | null = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  client = new Anthropic({ apiKey });
  return client;
}

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";

export interface CallOptions {
  endpoint: string;
  userId: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Single entry-point for Claude API calls. Handles the SDK contract,
 * extracts the assistant's text, and writes a usage_log row keyed to the
 * caller's endpoint so we can monitor cost.
 */
export async function callClaude(opts: CallOptions): Promise<CallResult> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    temperature: opts.temperature ?? 0.4,
    system: opts.systemPrompt,
    messages: [{ role: "user", content: opts.userPrompt }],
  });

  const text = message.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const inputTokens = message.usage?.input_tokens ?? 0;
  const outputTokens = message.usage?.output_tokens ?? 0;

  // Cost estimate — Opus 4.7 pricing as of writing: $15/MTok in, $75/MTok out.
  // Update if the price changes; this is for monitoring only.
  const cost =
    (inputTokens / 1_000_000) * 15 + (outputTokens / 1_000_000) * 75;

  try {
    const admin = createSupabaseAdminClient();
    await admin.from("usage_log").insert({
      endpoint: opts.endpoint,
      model: MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd_estimate: Number(cost.toFixed(4)),
      user_id: opts.userId,
    });
  } catch (err) {
    // Logging failures must never break the request flow.
    console.error("usage_log insert failed", err);
  }

  return { text, inputTokens, outputTokens };
}

/**
 * Find a fenced JSON block in Claude's response and parse it. Falls back to
 * parsing the entire string if no fence is found.
 */
export function extractJson<T>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fence ? fence[1] : text;
  return JSON.parse(body) as T;
}
