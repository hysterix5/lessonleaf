"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResourceSelect({ resources, value, onChange, className = "" }: {
  resources: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [otherSelected, setOtherSelected] = useState(false);
  const savedIndex = resources.indexOf(value);
  const isOther = savedIndex < 0 && (!!value || otherSelected);

  return <div className={`resource-field ${className}`}>
    <Label className="field"><span>Resource / textbook</span>
      <select className="native-select" value={isOther ? "other" : savedIndex >= 0 ? `saved-${savedIndex}` : "none"} onChange={(event) => {
        const choice = event.target.value;
        setOtherSelected(choice === "other");
        onChange(choice.startsWith("saved-") ? resources[Number(choice.slice(6))] : "");
      }}>
        <option value="none">No resource</option>
        {resources.map((resource, index) => <option key={`${index}-${resource}`} value={`saved-${index}`}>{resource}</option>)}
        <option value="other">Other — enter a resource</option>
      </select>
    </Label>
    {isOther && <Label className="field"><span>Other resource / textbook</span><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Enter a custom resource or textbook" maxLength={300} /></Label>}
    <small>{resources.length ? "Choose a saved resource or enter another one." : "Add reusable resources in Settings, or enter one here."}</small>
  </div>;
}
