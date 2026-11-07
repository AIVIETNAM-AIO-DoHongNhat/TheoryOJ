"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { requireTeacher } from "@/lib/auth/session";

import { normalizeStudentCode, STUDENT_CODE } from "./normalize";
import { parseRosterText, ROSTER_MAX } from "./parse";
import { deleteRosterEntry, upsertRoster } from "./server/roster";

function refresh() {
  revalidatePath("/quan-tri", "layout");
}

/** Nhập danh sách dán vào. Máy chủ đọc lại văn bản; còn dòng lỗi thì không nhập dòng nào. */
export async function importRoster(input: { text: string }): Promise<ActionResult<{ added: number; updated: number; synced: number }>> {
  const user = await requireTeacher();
  const text = z.string().max(500_000).safeParse(input?.text);
  if (!text.success) return { ok: false, error: "Văn bản quá dài, chia thành nhiều lần nhập." };
  const parsed = parseRosterText(text.data);
  if (parsed.length === 0) return { ok: false, error: "Không đọc được dòng nào." };
  if (parsed.length > ROSTER_MAX) return { ok: false, error: `Mỗi lần nhập tối đa ${ROSTER_MAX} học viên.` };
  const bad = parsed.find((p) => p.error);
  if (bad) return { ok: false, error: `Dòng ${bad.line}: ${bad.error}` };

  const result = await upsertRoster(parsed.map((p) => p.data!), user.id);
  refresh();
  return { ok: true, ...result };
}

export async function removeRosterEntry(code: string): Promise<ActionResult> {
  await requireTeacher();
  const studentCode = normalizeStudentCode(String(code ?? ""));
  if (!STUDENT_CODE.test(studentCode)) return { ok: false, error: "Mã học viên không hợp lệ." };
  if (!(await deleteRosterEntry(studentCode))) return { ok: false, error: "Mã này không còn trong danh sách." };
  refresh();
  return { ok: true };
}
