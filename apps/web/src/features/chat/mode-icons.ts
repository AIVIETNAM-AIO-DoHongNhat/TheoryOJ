import { BookOpenText, Calculator, ClipboardCheck, Landmark, type LucideIcon } from "lucide-react";

import type { ModeId } from "./modes";

export const MODE_ICONS: Record<ModeId, LucideIcon> = {
  qa: BookOpenText,
  exercise: Calculator,
  practice: Landmark,
  review: ClipboardCheck,
};
