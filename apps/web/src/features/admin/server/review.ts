import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { ReviewFilter, ReviewItem } from "../types";

export const PAGE_SIZE = 30;

const WHERE: Record<ReviewFilter, ReturnType<typeof sql>> = {
  "gan-co": sql`m.flagged`,
  "danh-gia": sql`f.rating = -1`,
  "tu-choi": sql`m.refused is not null and not m.flagged`,
  "tat-ca": sql`true`,
};

/** Nhật ký câu trả lời của trợ lý cho giảng viên xem, mới nhất trước. */
export async function getReviewLog(opts: {
  filter: ReviewFilter;
  unreviewedOnly: boolean;
  page: number;
}): Promise<{ items: ReviewItem[]; hasMore: boolean }> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select m.id, m.created_at, m.question, m.content, m.mode, m.chapters, m.label, m.refused, m.flagged,
           m.reviewed_at, m.max_score, c.subject,
           u.student_code, u.full_name, u.class_name,
           f.rating, f.reason, f.comment
    from messages m
    join conversations c on c.id = m.conversation_id
    left join users u on u.visitor_id = c.visitor_id
    left join lateral (
      select rating, reason, comment from feedback where message_id = m.id order by created_at desc limit 1
    ) f on true
    where m.role = 'assistant' and ${WHERE[opts.filter]}
      ${opts.unreviewedOnly ? sql`and m.reviewed_at is null` : sql``}
    order by m.created_at desc
    limit ${PAGE_SIZE + 1} offset ${(opts.page - 1) * PAGE_SIZE}`);

  const items = rows.slice(0, PAGE_SIZE).map(
    (r): ReviewItem => ({
      id: String(r.id),
      createdAt: new Date(String(r.created_at)).toISOString(),
      subject: String(r.subject),
      question: String(r.question ?? ""),
      answer: String(r.content ?? ""),
      mode: r.mode ? String(r.mode) : null,
      chapters: (r.chapters as number[] | null) ?? [],
      label: r.label ? String(r.label) : null,
      refused: r.refused ? String(r.refused) : null,
      flagged: Boolean(r.flagged),
      reviewed: r.reviewed_at !== null,
      maxScore: r.max_score === null ? null : Number(r.max_score),
      student: r.student_code
        ? { code: String(r.student_code), name: String(r.full_name), className: String(r.class_name) }
        : null,
      feedback: r.rating === null || r.rating === undefined
        ? null
        : { rating: Number(r.rating), reason: r.reason ? String(r.reason) : null, comment: r.comment ? String(r.comment) : null },
    }),
  );
  return { items, hasMore: rows.length > PAGE_SIZE };
}

/** Số tin nhắn chưa xem theo từng bộ lọc, để hiện trên các tab. */
export async function getReviewCounts(): Promise<Record<ReviewFilter, number>> {
  const [r] = await db.execute<Record<string, unknown>>(sql`
    select
      count(*) filter (where m.flagged) as gan_co,
      count(*) filter (where exists (select 1 from feedback f where f.message_id = m.id and f.rating = -1)) as danh_gia,
      count(*) filter (where m.refused is not null and not m.flagged) as tu_choi,
      count(*) as tat_ca
    from messages m where m.role = 'assistant' and m.reviewed_at is null`);
  return {
    "gan-co": Number(r.gan_co ?? 0),
    "danh-gia": Number(r.danh_gia ?? 0),
    "tu-choi": Number(r.tu_choi ?? 0),
    "tat-ca": Number(r.tat_ca ?? 0),
  };
}

export async function markReviewed(ids: string[], reviewed: boolean) {
  if (!ids.length) return;
  await db.execute(sql`
    update messages set reviewed_at = ${reviewed ? sql`now()` : sql`null`}
    where role = 'assistant' and id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
}
