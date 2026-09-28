import type { AiModel } from "./ai-content";

export type AiUsage = {
  provider: "Groq" | "Gemini";
  model: AiModel;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function readAiUsage(response: unknown, model: AiModel): AiUsage | null {
  if (!response || typeof response !== "object") return null;
  const gemini = model.startsWith("gemini-");
  const payload = response as Record<string, unknown>;
  const raw = payload[gemini ? "usageMetadata" : "usage"];
  if (!raw || typeof raw !== "object") return null;
  const usage = raw as Record<string, unknown>;
  const inputTokens = count(usage[gemini ? "promptTokenCount" : "prompt_tokens"]);
  const outputTokens = count(usage[gemini ? "candidatesTokenCount" : "completion_tokens"]);
  const totalTokens = count(usage[gemini ? "totalTokenCount" : "total_tokens"]);
  if (inputTokens === null || outputTokens === null || totalTokens === null) return null;
  return { provider: gemini ? "Gemini" : "Groq", model, inputTokens, outputTokens, totalTokens };
}
