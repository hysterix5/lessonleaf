"use client";

import { BookOpenText, CircleHelp, FileText, LayoutGrid, School, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type WorkspaceView = "builder" | "term" | "classes" | "course" | "library" | "settings" | "guide";

const items = [
  { view: "builder", label: "Generate plans", shortLabel: "Create", icon: LayoutGrid },
  { view: "classes", label: "Classes", shortLabel: "Classes", icon: School },
  { view: "course", label: "Course", shortLabel: "Course", icon: BookOpenText },
  { view: "library", label: "My lesson plans", shortLabel: "Plans", icon: FileText },
  { view: "settings", label: "Settings", shortLabel: "Settings", icon: Settings2 },
  { view: "guide", label: "Guide", shortLabel: "Guide", icon: CircleHelp },
] as const;

export function WorkspaceNav({ view, onNavigate, savedCount, mobile = false }: {
  view: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  savedCount: number;
  mobile?: boolean;
}) {
  return (
    <nav className={mobile ? "mobile-nav" : "side-nav"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
      {items.map(({ view: destination, label, shortLabel, icon: Icon }) => {
        const active = view === destination || (destination === "builder" && view === "term");
        return (
          <Button
            key={destination}
            type="button"
            variant="ghost"
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(destination)}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>{mobile ? shortLabel : label}</span>
            {!mobile && destination === "library" && <span className="nav-count">{savedCount}</span>}
          </Button>
        );
      })}
    </nav>
  );
}
