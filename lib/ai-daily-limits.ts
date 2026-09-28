import { aiModels, type AiModel } from "./ai-content";

export type DailyModelLimit = {
  requests: number | null;
  tokens: number | null;
  minuteRequests: number | null;
  minuteInputTokens: number | null;
  source: "Groq free plan reference" | "Gemini project limits" | "Configured";
};

export type DailyModelLimits = Record<AiModel, DailyModelLimit>;

const groqFreeLimit: DailyModelLimit = {
  requests: 1_000, tokens: 200_000, minuteRequests: null, minuteInputTokens: null,
  source: "Groq free plan reference",
};
const geminiProjectLimit: DailyModelLimit = {
  requests: 500, tokens: null, minuteRequests: 15, minuteInputTokens: 250_000,
  source: "Gemini project limits",
};

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function dailyModelLimits(raw = process.env.AI_DAILY_LIMITS): DailyModelLimits {
  let configured: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) configured = parsed as Record<string, unknown>;
    } catch { /* Ignore invalid optional overrides and retain documented defaults. */ }
  }

  return Object.fromEntries(aiModels.map((model) => {
    const fallback = model.startsWith("openai/") ? groqFreeLimit : geminiProjectLimit;
    const override = configured[model];
    if (!override || typeof override !== "object" || Array.isArray(override)) return [model, fallback];
    const limit = override as Record<string, unknown>;
    const requests = limit.requests === null ? null : positiveInteger(limit.requests) ?? fallback.requests;
    const tokens = limit.tokens === null ? null : positiveInteger(limit.tokens) ?? fallback.tokens;
    const minuteRequests = limit.minuteRequests === null ? null : positiveInteger(limit.minuteRequests) ?? fallback.minuteRequests;
    const minuteInputTokens = limit.minuteInputTokens === null ? null : positiveInteger(limit.minuteInputTokens) ?? fallback.minuteInputTokens;
    return [model, { requests, tokens, minuteRequests, minuteInputTokens, source: "Configured" }];
  })) as DailyModelLimits;
}
