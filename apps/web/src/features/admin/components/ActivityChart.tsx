import { cn } from "@/lib/utils";

import type { DayActivity } from "../server/stats";
import { Panel, PanelHeader } from "./AdminUi";

const SERIES = [
  { key: "questions", label: "Câu hỏi trợ lý", color: "bg-(--act-1)" },
  { key: "quizzes", label: "Lượt trắc nghiệm", color: "bg-(--act-2)" },
] as const;

const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${m}`;
};
const weekday = (iso: string) =>
  new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

/** Làm tròn trục lên số đẹp (1, 2, 5 × 10^n) để ba vạch lưới rơi vào số chẵn. */
function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * p * 4 >= v)! * p;
  return step * 4;
}

/**
 * Cột chồng theo ngày: câu hỏi trợ lý (dưới) và lượt trắc nghiệm (trên), một trục. Di chuột vào một cột thì hiện
 * số liệu ngày đó; vùng vẽ ẩn với trình đọc màn hình, thay bằng bảng ẩn bên dưới.
 */
export function ActivityChart({ data, className }: { data: DayActivity[]; className?: string }) {
  const totals = { questions: data.reduce((n, d) => n + d.questions, 0), quizzes: data.reduce((n, d) => n + d.quizzes, 0) };
  const max = niceMax(Math.max(1, ...data.map((d) => d.questions + d.quizzes)));
  const ticks = [max, max / 2, 0];

  return (
    <Panel className={cn("flex flex-col", className)}>
      <PanelHeader
        title={`Hoạt động ${data.length} ngày qua`}
        description="Mỗi cột là một ngày, tính theo giờ Việt Nam."
        actions={
          <ul className="flex items-center gap-4">
            {SERIES.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-xs">
                <span className={cn("size-2.5 rounded-[3px]", s.color)} aria-hidden />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold tabular-nums">{totals[s.key]}</span>
              </li>
            ))}
          </ul>
        }
      />

      <div className="flex flex-1 flex-col px-5 pt-6 pb-4" aria-hidden>
        <div className="relative flex h-44 flex-1">
          {/* Vạch lưới và nhãn trục, rất nhạt để không tranh với cột. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="flex h-0 items-center gap-2">
                <span className="w-6 text-right text-[10px] tabular-nums text-muted-foreground/70">{t}</span>
                <span className={cn("h-px flex-1", t === 0 ? "bg-border" : "border-t border-dashed border-border/70")} />
              </div>
            ))}
          </div>

          <div className="relative ml-8 flex flex-1 items-end gap-1 sm:gap-1.5">
            {data.map((d, i) => {
              const total = d.questions + d.quizzes;
              return (
                <div
                  key={d.day}
                  className="group/bar relative flex h-full flex-1 cursor-default flex-col items-center justify-end rounded-md hover:bg-muted/60"
                >
                  {/* Hai đoạn chồng nhau, cách nhau 2px; chỉ đầu trên cùng bo góc. */}
                  <div className="flex w-full max-w-6 flex-col-reverse gap-0.5" style={{ height: `${(total / max) * 100}%` }}>
                    {SERIES.map((s, si) => {
                      const v = d[s.key];
                      if (!v) return null;
                      const top = si === SERIES.length - 1 || !d[SERIES[si + 1].key];
                      return (
                        <div
                          key={s.key}
                          className={cn("min-h-[3px] w-full", s.color, top && "rounded-t-[4px]")}
                          style={{ flexGrow: v, flexBasis: 0 }}
                        />
                      );
                    })}
                  </div>

                  {/* Hộp số liệu nằm trong vùng vẽ (khối bị cắt tràn); cột ở hai mép thì canh theo mép để không tràn ra ngoài. */}
                  <div
                    className={cn(
                      "pointer-events-none absolute top-1 z-10 w-max scale-95 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-lg transition-all group-hover/bar:scale-100 group-hover/bar:opacity-100",
                      i < 3 ? "left-0" : i > data.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2",
                    )}
                  >
                    <p className="mb-1 font-medium capitalize">{weekday(d.day)}</p>
                    {SERIES.map((s) => (
                      <p key={s.key} className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-[2px]", s.color)} />
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="ml-auto pl-3 font-semibold tabular-nums">{d[s.key]}</span>
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 ml-8 flex gap-1 sm:gap-1.5">
          {data.map((d, i) => (
            <span
              key={d.day}
              className={cn(
                "flex-1 text-center text-[10px] tabular-nums text-muted-foreground",
                i === data.length - 1 ? "font-semibold text-foreground" : i % 2 === 1 && "max-sm:invisible",
              )}
            >
              {i === data.length - 1 ? "Nay" : dayLabel(d.day)}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Hoạt động theo ngày</caption>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Câu hỏi trợ lý</th>
            <th>Lượt trắc nghiệm</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{weekday(d.day)}</td>
              <td>{d.questions}</td>
              <td>{d.quizzes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
