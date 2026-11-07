import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { type ExamPhase, PHASE_LABELS } from "../logic";

const TONE: Record<ExamPhase, string> = {
  nhap: "border-border bg-muted text-muted-foreground",
  "sap-mo": "border-warn/30 bg-warn-soft text-warn",
  "dang-mo": "border-primary/30 bg-primary-soft text-primary",
  "da-dong": "border-border bg-background text-muted-foreground",
};

export function PhaseBadge({ phase, className }: { phase: ExamPhase; className?: string }) {
  return (
    <Badge variant="outline" className={cn(TONE[phase], className)}>
      {phase === "dang-mo" && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
      {PHASE_LABELS[phase]}
    </Badge>
  );
}
