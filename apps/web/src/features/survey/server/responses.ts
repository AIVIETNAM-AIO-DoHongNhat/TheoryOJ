import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { surveyResponses } from "@/lib/db/schema";

import type { SurveyPhase, SurveyRole } from "../questions";

export interface SavedSurvey {
  role: SurveyRole;
  answers: Record<string, number>;
  comment: string | null;
  updatedAt: Date;
}

/** Phiếu trình duyệt này đã gửi ở đợt `phase`, để điền sẵn khi mở lại. */
export async function getSurvey(visitorId: string, phase: SurveyPhase): Promise<SavedSurvey | null> {
  const [row] = await db
    .select({ role: surveyResponses.role, answers: surveyResponses.answers, comment: surveyResponses.comment, updatedAt: surveyResponses.updatedAt })
    .from(surveyResponses)
    .where(and(eq(surveyResponses.visitorId, visitorId), eq(surveyResponses.phase, phase)))
    .limit(1);
  return row ? { ...row, answers: row.answers as Record<string, number> } : null;
}

export async function saveSurvey(r: { visitorId: string; phase: SurveyPhase; role: SurveyRole; answers: Record<string, number>; comment: string | null }) {
  await db
    .insert(surveyResponses)
    .values(r)
    .onConflictDoUpdate({
      target: [surveyResponses.visitorId, surveyResponses.phase],
      set: { role: r.role, answers: r.answers, comment: r.comment, updatedAt: new Date() },
    });
}
