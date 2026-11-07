"use client";

import { Dices, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LETTERS } from "@/features/question-bank/letters";
import { cn } from "@/lib/utils";

import type { PickerQuestion } from "../types";

const ALL = "tat-ca";
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/**
 * Chọn câu cho đề từ ngân hàng của môn. Lọc theo chương, tìm theo chữ, chọn ngẫu nhiên N câu trong phần đang lọc.
 * Câu đã chọn nhưng không còn trong ngân hàng (bị xóa sau khi lưu đề) vẫn được giữ, hiện ở cuối danh sách.
 */
export function QuestionPicker({
  questions,
  chapters,
  selected,
  onChange,
  disabled,
}: {
  questions: PickerQuestion[];
  chapters: { number: number; title: string }[];
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
}) {
  const [chapter, setChapter] = useState<string>(ALL);
  const [q, setQ] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [randomCount, setRandomCount] = useState("10");
  const chosen = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    return questions.filter(
      (x) =>
        (chapter === ALL || x.chapter === Number(chapter)) &&
        (!onlySelected || chosen.has(x.key)) &&
        (!needle || norm(`${x.code} ${x.q} ${x.options.join(" ")}`).includes(needle)),
    );
  }, [questions, chapter, q, onlySelected, chosen]);

  const missing = selected.filter((k) => !questions.some((x) => x.key === k));
  const perChapter = chapters
    .map((c) => ({ ...c, n: questions.filter((x) => x.chapter === c.number && chosen.has(x.key)).length }))
    .filter((c) => c.n > 0);

  const toggle = (key: string, on: boolean) => onChange(on ? [...selected, key] : selected.filter((k) => k !== key));
  const allFiltered = filtered.length > 0 && filtered.every((x) => chosen.has(x.key));
  const someFiltered = filtered.some((x) => chosen.has(x.key));

  function toggleAll(on: boolean) {
    const keys = new Set(filtered.map((x) => x.key));
    onChange(on ? [...selected, ...filtered.filter((x) => !chosen.has(x.key)).map((x) => x.key)] : selected.filter((k) => !keys.has(k)));
  }

  function pickRandom() {
    const n = Math.max(1, Math.min(200, Number(randomCount) || 0));
    const pool = filtered.filter((x) => !chosen.has(x.key)).map((x) => x.key);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    onChange([...selected, ...pool.slice(0, n)]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-subtle px-3 py-2.5 text-[13px]">
        <span>
          Đã chọn <b className="font-heading text-base tabular-nums text-primary">{selected.length}</b> câu
        </span>
        {perChapter.map((c) => (
          <span key={c.number} className="rounded-md border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground">
            Ch.{c.number}: <b className="text-foreground tabular-nums">{c.n}</b>
          </span>
        ))}
        {missing.length > 0 && (
          <span className="rounded-md border border-warn/40 bg-warn-soft px-1.5 py-0.5 text-[11px] text-warn">
            {missing.length} câu đã xóa khỏi ngân hàng, giữ bản trong đề
          </span>
        )}
        {selected.length > 0 && !disabled && (
          <Button variant="ghost" size="xs" className="ml-auto" onClick={() => onChange([])}>
            <X data-icon="inline-start" />
            Bỏ chọn hết
          </Button>
        )}
      </div>

      {!disabled && (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <Select
            items={[{ value: ALL, label: "Mọi chương" }, ...chapters.map((c) => ({ value: String(c.number), label: `Chương ${c.number}` }))]}
            value={chapter}
            onValueChange={(v) => setChapter(v as string)}
          >
            <SelectTrigger className="bg-background data-[size=default]:h-9 lg:w-40" aria-label="Lọc theo chương">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL}>Mọi chương</SelectItem>
                {chapters.map((c) => (
                  <SelectItem key={c.number} value={String(c.number)}>
                    Chương {c.number}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <InputGroup className="h-9 bg-background lg:w-72">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm câu hỏi" aria-label="Tìm câu hỏi" />
          </InputGroup>
          <label className="inline-flex items-center gap-2 text-[13px]">
            <Checkbox checked={onlySelected} onCheckedChange={(v) => setOnlySelected(Boolean(v))} />
            Chỉ câu đã chọn
          </label>
          <div className="flex items-center gap-1.5 lg:ml-auto">
            <Input
              value={randomCount}
              onChange={(e) => setRandomCount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="h-8 w-16 text-center"
              aria-label="Số câu chọn ngẫu nhiên"
            />
            <Button variant="outline" onClick={pickRandom} disabled={filtered.every((x) => chosen.has(x.key))}>
              <Dices data-icon="inline-start" />
              Chọn ngẫu nhiên
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border">
        {!disabled && (
          <label className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-[12px] font-medium text-muted-foreground">
            <Checkbox checked={allFiltered} indeterminate={!allFiltered && someFiltered} onCheckedChange={(v) => toggleAll(Boolean(v))} />
            {filtered.length} câu trong bộ lọc
          </label>
        )}
        <ul className="max-h-[30rem] divide-y overflow-y-auto">
          {(disabled ? questions.filter((x) => chosen.has(x.key)) : filtered).map((x) => {
            const on = chosen.has(x.key);
            return (
              <li key={x.key}>
                <label className={cn("flex cursor-pointer gap-3 px-3 py-2.5 hover:bg-muted/40", on && "bg-primary-soft/60", disabled && "cursor-default")}>
                  <Checkbox className="mt-0.5" checked={on} disabled={disabled} onCheckedChange={(v) => toggle(x.key, Boolean(v))} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      Chương {x.chapter} · <span className="font-mono">{x.code}</span>
                      {x.examOnly && <span className="text-primary"> · chỉ dùng cho đề thi</span>}
                    </span>
                    <span className="text-[13px] font-medium leading-snug">{x.q}</span>
                    <span className="line-clamp-1 text-[12px] text-primary">
                      Đáp án {LETTERS[x.answer]}. {x.options[x.answer]}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
          {filtered.length === 0 && !disabled && <li className="px-3 py-8 text-center text-sm text-muted-foreground">Không có câu phù hợp.</li>}
        </ul>
      </div>
    </div>
  );
}
