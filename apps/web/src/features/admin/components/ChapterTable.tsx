import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Subject } from "@/config/subjects";
import { PASS_RATIO } from "@/features/quiz/types";

import type { ChapterStat } from "../server/stats";
import { pct, score10 } from "./AdminHeading";

/** Bảng điểm theo chương: điểm lượt đầu, lượt cao nhất, tỷ lệ đạt, thẻ đã thuộc. Chương có tỷ lệ đạt thấp nhất được đánh dấu. */
export function ChapterTable({ subject, stats, cardTotals }: { subject: Subject; stats: ChapterStat[]; cardTotals: Record<number, number> }) {
  const attempted = stats.filter((s) => s.people > 0 && s.passRate !== null);
  const weakest = attempted.length > 1 ? attempted.reduce((a, b) => (b.passRate! < a.passRate! ? b : a)) : null;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Chương</TableHead>
          <TableHead className="text-right">Người làm</TableHead>
          <TableHead className="text-right">Điểm lượt đầu</TableHead>
          <TableHead className="text-right">Điểm cao nhất</TableHead>
          <TableHead className="w-40">Tỷ lệ đạt (từ {score10(PASS_RATIO)})</TableHead>
          <TableHead className="text-right">Thẻ đã thuộc / người</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subject.chapters.map((c) => {
          const s = stats.find((x) => x.chapter === c.number);
          return (
            <TableRow key={c.number}>
              <TableCell className="min-w-56 max-w-72 whitespace-normal">
                <span className="mr-2 font-heading font-bold text-primary">{String(c.number).padStart(2, "0")}</span>
                {c.title}
                {weakest?.chapter === c.number && (
                  <Badge variant="destructive" className="ml-2">Cần chú ý</Badge>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{s?.people || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{score10(s?.firstAvg ?? null)}</TableCell>
              <TableCell className="text-right tabular-nums">{score10(s?.bestAvg ?? null)}</TableCell>
              <TableCell>
                {s?.passRate === null || s?.passRate === undefined ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Progress value={s.passRate * 100} className="flex-1" aria-label={`Tỷ lệ đạt chương ${c.number}`} />
                    <span className="w-10 text-right text-xs tabular-nums">{pct(s.passRate)}</span>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {s?.masteredAvg === null || s?.masteredAvg === undefined
                  ? "—"
                  : `${(Math.round(s.masteredAvg * 10) / 10).toLocaleString("vi-VN")}/${cardTotals[c.number] ?? 0}`}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
