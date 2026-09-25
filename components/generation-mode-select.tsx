import { Label } from "@/components/ui/label";

export type GenerationMode = "template" | "ai";

export function GenerationModeSelect({ value, onChange, disabled = false }: {
  value: GenerationMode;
  onChange: (value: GenerationMode) => void;
  disabled?: boolean;
}) {
  return <Label className="field generation-mode-field">
    <span>Generation mode</span>
    <select className="native-select" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as GenerationMode)}>
      <option value="template">Smart Template</option>
      <option value="ai">AI draft · GPT-OSS 120B</option>
    </select>
    <small>{value === "ai" ? "Uses AI to write editable lesson content. Sign-in is required." : "Creates an editable lesson from the built-in format."}</small>
  </Label>;
}
