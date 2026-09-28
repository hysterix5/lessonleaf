import { aiModels, type AiModel } from "./ai-content";
import type { DailyModelLimit } from "./ai-daily-limits";

export type WarningLevel = "normal" | "near" | "reached" | "unknown";

export type MinuteUsage = { requests: number; inputTokens: number };
export type MinuteUsageByModel = Record<AiModel, MinuteUsage>;

export function minuteUsageByModel(rows: { model: string; input_tokens: number }[]): MinuteUsageByModel {
  const totals = Object.fromEntries(aiModels.map((model) => [model, { requests: 0, inputTokens: 0 }])) as MinuteUsageByModel;
  for (const row of rows) {
    if (!Object.hasOwn(totals, row.model)) continue;
    const usage = totals[row.model as AiModel];
    usage.requests += 1;
    usage.inputTokens += row.input_tokens;
  }
  return totals;
}

export function usageWarning(requests: number, tokens: number, limit: Pick<DailyModelLimit, "requests" | "tokens">): WarningLevel {
  const fractions = [
    limit.requests ? requests / limit.requests : null,
    limit.tokens ? tokens / limit.tokens : null,
  ].filter((fraction): fraction is number => fraction !== null);
  if (!fractions.length) return "unknown";
  const highest = Math.max(...fractions);
  return highest >= 1 ? "reached" : highest >= 0.8 ? "near" : "normal";
}
