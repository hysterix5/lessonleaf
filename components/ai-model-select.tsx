import { Label } from "@/components/ui/label";
import type { AiModelChoice } from "@/lib/ai-content";

export function AiModelSelect({ value, onChange, disabled = false }: {
  value: AiModelChoice;
  onChange: (value: AiModelChoice) => void;
  disabled?: boolean;
}) {
  return <Label className="field ai-model-field">
    <span>AI model</span>
    <select className="native-select" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as AiModelChoice)}>
      <option value="auto">Auto · balance available models</option>
      <option value="openai/gpt-oss-120b">GPT-OSS 120B · Groq</option>
      <option value="openai/gpt-oss-20b">GPT-OSS 20B · Groq</option>
      <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite · Google</option>
    </select>
    <small>{value === "auto" ? "Balances configured models and switches when one reaches its limit." : "Uses this model for the full draft and waits if it reaches its limit."}</small>
  </Label>;
}
