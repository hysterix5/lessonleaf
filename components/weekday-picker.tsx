"use client";

import { Button } from "@/components/ui/button";

export const weekdays = [
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
  { value: 0, label: "Sun", full: "Sunday" },
];

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (value: number[]) => void }) {
  return <div className="weekday-picker" role="group" aria-label="Class meeting days">{weekdays.map((day) => <Button
    key={day.value} type="button" variant="outline" aria-pressed={value.includes(day.value)}
    className={value.includes(day.value) ? "selected" : ""}
    onClick={() => onChange(value.includes(day.value) ? value.filter((item) => item !== day.value) : [...value, day.value])}
  >{day.label}</Button>)}</div>;
}
