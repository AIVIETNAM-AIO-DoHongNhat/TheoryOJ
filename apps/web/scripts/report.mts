/**
 * Báo cáo số liệu cho hồ sơ sáng kiến (PLAN.md mục 10): mức độ sử dụng, hiệu quả ôn tập, khảo sát trước và sau.
 * In ra Markdown, chép thẳng vào hồ sơ được.
 *
 *   npx tsx scripts/report.mts                                  # toàn bộ dữ liệu
 *   npx tsx scripts/report.mts --from 2026-11-10 --to 2026-11-24 > bao-cao.md   # chỉ đợt thử nghiệm
 *
 * Trên máy chủ: docker compose -f infra/docker-compose.prod.yml run --rm migrate npx tsx scripts/report.mts
 */
import { parseArgs } from "node:util";

import postgres from "postgres";

import { questionsFor, ROLE_LABELS, type SurveyPhase, type SurveyRole } from "@/features/survey/questions";
import { env } from "@/lib/env";

const { values: args } = parseArgs({
  options: {
    from: { type: "string" },
    to: { type: "string" },
  },
});

const from = args.from ? new Date(`${args.from}T00:00:00+07:00`) : new Date("2000-01-01");
// --to tính cả ngày cuối.
const to = args.to ? new Date(new Date(`${args.to}T00:00:00+07:00`).getTime() + 86_400_000) : new Date("2100-01-01");

const sql = postgres(env.DATABASE_URL, { max: 1 });
const out: string[] = [];
const line = (s = "") => out.push(s);
const n = (x: number) => x.toLocaleString("vi-VN");
const pct = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toLocaleString("vi-VN")} %` : "—");
const dec = (x: number | null) => (x === null ? "—" : (Math.round(x * 100) / 100).toLocaleString("vi-VN"));

function table(head: string[], rows: (string | number)[][]) {
  line(`| ${head.join(" | ")} |`);
  line(`|${head.map(() => "---").join("|")}|`);
  for (const r of rows) line(`| ${r.join(" | ")} |`);
  line();
}

async function usage() {
  const [u] = await sql`
    select
      (select count(distinct visitor_id) from conversations where created_at >= ${from} and created_at < ${to})::int as chat_visitors,
      (select count(distinct visitor_id) from practice_attempts where created_at >= ${from} and created_at < ${to})::int as practice_visitors,
      count(*)::int as turns,
      count(*) filter (where refused is null and not incomplete)::int as answered,
      count(*) filter (where refused is not null)::int as refused,
      count(*) filter (where flagged)::int as flagged,
      count(*) filter (where incomplete)::int as incomplete,
      percentile_cont(0.5) within group (order by latency_ms) filter (where refused is null and not incomplete) as p50,
      percentile_cont(0.9) within group (order by latency_ms) filter (where refused is null and not incomplete) as p90
    from messages m
    where role = 'assistant' and created_at >= ${from} and created_at < ${to}`;
  const [f] = await sql`
    select count(*) filter (where rating = 1)::int as up, count(*) filter (where rating = -1)::int as down
    from feedback where created_at >= ${from} and created_at < ${to}`;

  line("## 1. Mức độ sử dụng");
  line();
  table(["Chỉ số", "Giá trị"], [
    ["Trình duyệt đã hỏi trợ lý", n(u.chat_visitors)],
    ["Trình duyệt đã ôn tập (trắc nghiệm, bài tập)", n(u.practice_visitors)],
    ["Lượt hỏi trợ lý", n(u.turns)],
    ["Được trả lời", `${n(u.answered)} (${pct(u.answered, u.turns)})`],
    ["Bị từ chối (ngoài phạm vi, khiêu khích, chèn lệnh, không đủ căn cứ)", `${n(u.refused)} (${pct(u.refused, u.turns)})`],
    ["Gắn cờ cần giảng viên xem", n(u.flagged)],
    ["Lỗi hoặc bị dừng giữa chừng", n(u.incomplete)],
    ["Đánh giá 👍 / 👎", `${n(f.up)} / ${n(f.down)} (hữu ích ${pct(f.up, f.up + f.down)})`],
    ["Thời gian trả lời trọn câu, trung vị / 90 %", u.p50 === null ? "—" : `${dec(u.p50 / 1000)} giây / ${dec(u.p90 / 1000)} giây`],
  ]);

  const modes = await sql`
    select mode, count(*)::int as c from messages
    where role = 'assistant' and created_at >= ${from} and created_at < ${to} group by mode order by c desc`;
  const chapters = await sql`
    select ch, count(*)::int as c from messages, unnest(chapters) as ch
    where role = 'assistant' and created_at >= ${from} and created_at < ${to} group by ch order by ch`;
  if (modes.length) {
    line("Lượt hỏi theo chế độ:");
    line();
    table(["Chế độ", "Lượt"], modes.map((r) => [r.mode ?? "—", n(r.c)]));
  }
  if (chapters.length) {
    line("Lượt hỏi có chọn chương:");
    line();
    table(["Chương", "Lượt"], chapters.map((r) => [r.ch, n(r.c)]));
  }
}

async function learning() {
  // Lượt đầu và lượt cuối trắc nghiệm của mỗi trình duyệt ở mỗi chương, chỉ tính người làm từ hai lượt.
  const rows = await sql`
    with q as (
      select visitor_id, subject, chapter, score::float / total as r,
             row_number() over (partition by visitor_id, subject, chapter order by created_at) as k,
             count(*) over (partition by visitor_id, subject, chapter) as total_attempts
      from practice_attempts
      where kind = 'quiz' and created_at >= ${from} and created_at < ${to}
    )
    select chapter,
           count(*) filter (where k = 1)::int as people,
           count(*) filter (where k = 1 and total_attempts >= 2)::int as repeaters,
           avg(r) filter (where k = 1) as first_all,
           avg(r) filter (where k = 1 and total_attempts >= 2) as first_rep,
           avg(r) filter (where k = total_attempts and total_attempts >= 2) as last_rep,
           count(*)::int as attempts
    from q group by chapter order by chapter`;
  const [ex] = await sql`
    select count(*)::int as attempts, count(*) filter (where score = total)::int as solved
    from practice_attempts where kind = 'exercise' and created_at >= ${from} and created_at < ${to}`;

  line("## 2. Hiệu quả ôn tập");
  line();
  line("Điểm trắc nghiệm tính theo tỷ lệ câu đúng trên thang 10. \"Lượt đầu → lượt cuối\" chỉ tính trình duyệt làm từ hai lượt trở lên ở chương đó.");
  line();
  const ten = (x: number | null) => (x === null ? "—" : dec(x * 10));
  table(
    ["Chương", "Lượt làm", "Người làm", "Điểm lượt đầu (mọi người)", "Người làm lại", "Lượt đầu → lượt cuối"],
    rows.map((r) => [r.chapter, n(r.attempts), n(r.people), ten(r.first_all), n(r.repeaters), `${ten(r.first_rep)} → ${ten(r.last_rep)}`]),
  );
  line(`Bài tập tính toán: ${n(ex.attempts)} lượt, làm đúng hết ${n(ex.solved)} lượt (${pct(ex.solved, ex.attempts)}).`);
  line();
}

async function survey() {
  const rows = await sql`
    select phase, role, answers, comment from survey_responses
    where updated_at >= ${from} and updated_at < ${to}`;
  line("## 3. Khảo sát thang 5 điểm");
  line();
  if (!rows.length) {
    line("Chưa có phiếu khảo sát.");
    line();
    return;
  }
  for (const role of Object.keys(ROLE_LABELS) as SurveyRole[]) {
    const of = (phase: SurveyPhase) => rows.filter((r) => r.role === role && r.phase === phase);
    const before = of("truoc");
    const after = of("sau");
    if (!before.length && !after.length) continue;
    const mean = (list: readonly postgres.Row[], id: string) => {
      const xs = list.map((r) => (r.answers as Record<string, number>)[id]).filter((x) => typeof x === "number");
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    };
    line(`### ${ROLE_LABELS[role]}: ${n(before.length)} phiếu trước, ${n(after.length)} phiếu sau`);
    line();
    table(
      ["Câu hỏi", "Trước", "Sau", "Chênh lệch"],
      questionsFor(role, "sau").map((q) => {
        const b = q.phases.includes("truoc") ? mean(before, q.id) : null;
        const a = mean(after, q.id);
        const diff = a !== null && b !== null ? `${a - b >= 0 ? "+" : ""}${dec(a - b)}` : "—";
        return [q.text, dec(b), dec(a), diff];
      }),
    );
    const comments = [...before, ...after].map((r) => r.comment as string | null).filter((c): c is string => !!c);
    if (comments.length) {
      line(`Góp ý (${n(comments.length)}):`);
      line();
      for (const c of comments) line(`- ${c.replace(/\s+/g, " ")}`);
      line();
    }
  }
}

try {
  const range = args.from || args.to ? `từ ${args.from ?? "đầu"} đến ${args.to ?? "nay"}` : "toàn bộ dữ liệu";
  line(`# Báo cáo số liệu TheoryOJ (${range})`);
  line();
  line(`Xuất lúc ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Mỗi trình duyệt tương ứng một người dùng ẩn danh.`);
  line();
  await usage();
  await learning();
  await survey();
  console.log(out.join("\n"));
} finally {
  await sql.end();
}
