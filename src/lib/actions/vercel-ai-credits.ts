"use server";

import { createGateway } from "@ai-sdk/gateway";

export type GetVercelAiCreditsResult =
  | { ok: true; balance: number; totalUsed: number }
  | { ok: false; error: "NOT_CONFIGURED" | "FETCH_FAILED" };

/**
 * Reads Vercel AI Gateway account credits via the official API (same key as enrichment).
 * Never exposes the API key; server-only.
 */
export async function getVercelAiCredits(): Promise<GetVercelAiCreditsResult> {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "NOT_CONFIGURED" };
  }
  try {
    const gateway = createGateway({ apiKey });
    const credits = await gateway.getCredits();
    const balance = Number.parseFloat(credits.balance);
    const totalUsed = Number.parseFloat(credits.totalUsed);
    if (!Number.isFinite(balance) || !Number.isFinite(totalUsed)) {
      return { ok: false, error: "FETCH_FAILED" };
    }
    return { ok: true, balance, totalUsed };
  } catch {
    return { ok: false, error: "FETCH_FAILED" };
  }
}
