"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { type DataResult, UserError } from "@/lib/action-result";
import { env } from "@/lib/env";
import { clientIp, hitRateLimits } from "@/lib/rate-limit";
import { run } from "@/lib/run-action";
import { ensureVisitorId } from "@/lib/visitor";

import { questionsFor } from "./questions";
import { saveSurvey } from "./server/responses";

const SubmitInput = z.object({
  role: z.enum(["hoc-vien", "giang-vien"]),
  answers: z.record(z.string().max(32), z.number().int().min(1).max(5)),
  comment: z.string().trim().max(1000).optional(),
});

/** Lưu phiếu của đợt đang mở. Mỗi trình duyệt một phiếu mỗi đợt; gửi lại thì ghi đè phiếu cũ. */
export async function submitSurvey(input: z.input<typeof SubmitInput>): Promise<DataResult<void>> {
  return run(async () => {
    const { role, answers, comment } = SubmitInput.parse(input);
    const phase = env.SURVEY_PHASE;
    if (phase === "dong") throw new UserError("Khảo sát đã đóng.");
    // Phiếu không cần đăng nhập: giới hạn theo IP để xóa cookie gửi lại hàng loạt không làm lệch số liệu khảo sát.
    // Cả lớp có thể chung một IP nên giới hạn rộng.
    const wait = await hitRateLimits([{ key: `ks-ip:${clientIp(await headers())}`, windowSec: 3600, max: 200 }]);
    if (wait > 0) throw new UserError("Đã nhận quá nhiều phiếu từ mạng này. Đồng chí thử lại sau ít phút.");
    const questions = questionsFor(role, phase);
    // Chỉ nhận đúng các câu của phiếu, và phải trả lời đủ.
    if (questions.some((q) => answers[q.id] === undefined)) throw new UserError("Chưa trả lời đủ các câu.");
    const kept = Object.fromEntries(questions.map((q) => [q.id, answers[q.id]]));
    await saveSurvey({ visitorId: await ensureVisitorId(), phase, role, answers: kept, comment: comment || null });
  });
}
