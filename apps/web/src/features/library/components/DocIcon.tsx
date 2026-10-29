import { BookOpen, BookText, ChartColumn, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";

import type { DocKind } from "../types";

export const KIND_ICONS: Record<DocKind, LucideIcon> = {
  giao_trinh: BookOpen,
  van_kien: Landmark,
  tham_khao: BookText,
  cand: ShieldCheck,
  so_lieu: ChartColumn,
};
