"use client";

import { Plus, Save, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PanelHeader } from "@/features/admin/components/AdminUi";

import { saveExam } from "../actions";
import { durationText, type Reveal, REVEAL_LABELS, REVEALS } from "../logic";
import { fromLocalInput, toLocalInput } from "../time";
import type { ExamDraft, PickerQuestion } from "../types";
import { QuestionPicker } from "./QuestionPicker";

/**
 * Tạo hoặc sửa đề thi: thông tin, thời gian, lớp được giao, cách làm và câu hỏi.
 * Đề đã có học viên làm thì khóa phần câu hỏi và cách trộn.
 */
export function ExamForm({
  draft,
  questions,
  chapters,
  classes,
}: {
  draft: ExamDraft;
  questions: PickerQuestion[];
  chapters: { number: number; title: string }[];
  /** Các lớp đang có học viên (users.class_name) kèm số học viên. */
  classes: { name: string; students: number }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [duration, setDuration] = useState(String(draft.durationMin));
  const [opensAt, setOpensAt] = useState(toLocalInput(draft.opensAt));
  const [closesAt, setClosesAt] = useState(toLocalInput(draft.closesAt));
  const [maxAttempts, setMaxAttempts] = useState(String(draft.maxAttempts));
  const [chosenClasses, setChosenClasses] = useState<string[]>(draft.classes);
  const [extraClass, setExtraClass] = useState("");
  const [shuffle, setShuffle] = useState(draft.shuffle);
  const [reveal, setReveal] = useState<Reveal>(draft.reveal);
  const [keys, setKeys] = useState<string[]>(draft.questionKeys);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const knownClasses = [...classes.map((c) => c.name), ...chosenClasses.filter((c) => !classes.some((k) => k.name === c))];
  const toggleClass = (name: string, on: boolean) => setChosenClasses((cs) => (on ? [...cs, name] : cs.filter((c) => c !== name)));
  const assignedCount = chosenClasses.length
    ? classes.filter((c) => chosenClasses.includes(c.name)).reduce((n, c) => n + c.students, 0)
    : classes.reduce((n, c) => n + c.students, 0);

  function addClass() {
    const name = extraClass.trim().toUpperCase();
    if (name && !chosenClasses.includes(name)) setChosenClasses((cs) => [...cs, name]);
    setExtraClass("");
  }

  function save(status: "nhap" | "da-giao") {
    setError(null);
    const durationMin = Number(duration);
    if (!Number.isInteger(durationMin) || durationMin < 1) return setError("Thời gian làm bài phải là số phút nguyên dương.");
    const attempts = Number(maxAttempts);
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10) return setError("Số lượt làm từ 1 đến 10.");
    // Câu theo thứ tự trong ngân hàng (chương, rồi thứ tự câu); câu đã xóa khỏi ngân hàng giữ ở cuối.
    const order = new Map(questions.map((q, i) => [q.key, i]));
    const questionKeys = [...keys].sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9));

    startTransition(async () => {
      try {
        const res = await saveExam({
          id: draft.id,
          subject: draft.subject,
          title,
          description,
          questionKeys,
          durationMin,
          opensAt: fromLocalInput(opensAt),
          closesAt: fromLocalInput(closesAt),
          classes: chosenClasses,
          maxAttempts: attempts,
          shuffle,
          reveal,
          status,
        });
        if (!res.ok) return setError(res.error);
        router.push(`/quan-tri/de-thi/${res.id}`);
      } catch {
        setError("Chưa lưu được đề. Thử lại sau ít phút.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {draft.locked && (
        <Alert>
          <AlertTitle>Đề đã có học viên làm</AlertTitle>
          <AlertDescription>
            Câu hỏi và cách trộn được giữ nguyên để kết quả không bị lệch. Vẫn đổi được tên đề, thời gian, lớp được giao và cách xem đáp án.
            Muốn đổi câu hỏi, hãy sao chép đề ở trang kết quả.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Thông tin đề" />
          <div className="flex flex-col gap-5 p-5">
            <Field>
              <FieldLabel htmlFor="ten-de">Tên đề</FieldLabel>
              <Input id="ten-de" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Kiểm tra giữa kỳ chương 1–3" className="h-9" />
            </Field>
            <Field>
              <FieldLabel htmlFor="huong-dan">Hướng dẫn cho học viên</FieldLabel>
              <Textarea
                id="huong-dan"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Không bắt buộc. Ví dụ: Làm độc lập, không mở tài liệu."
              />
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Thời gian" description="Giờ Việt Nam. Bỏ trống giờ mở là mở ngay khi giao; bỏ trống giờ đóng là không có hạn." />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="thoi-gian">Thời gian làm bài (phút)</FieldLabel>
              <Input id="thoi-gian" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))} className="h-9" />
              <FieldDescription>{Number(duration) > 0 ? durationText(Number(duration)) : " "}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="so-luot">Số lượt làm tối đa</FieldLabel>
              <Input id="so-luot" inputMode="numeric" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value.replace(/\D/g, ""))} className="h-9" />
              <FieldDescription>Bảng kết quả lấy lượt cao nhất.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="mo-de">Giờ mở đề</FieldLabel>
              <Input id="mo-de" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="h-9" />
            </Field>
            <Field>
              <FieldLabel htmlFor="dong-de">Giờ đóng đề</FieldLabel>
              <Input id="dong-de" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="h-9" />
              <FieldDescription>Tới giờ đóng, bài đang làm được tự nộp.</FieldDescription>
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Giao cho lớp"
            description={chosenClasses.length ? `${assignedCount} học viên thuộc ${chosenClasses.length} lớp đã chọn.` : `Không chọn lớp nào là giao cho mọi học viên (${assignedCount}).`}
          />
          <div className="flex flex-col gap-4 p-5">
            {knownClasses.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {knownClasses.map((name) => {
                  const info = classes.find((c) => c.name === name);
                  return (
                    <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-[13px] hover:border-primary/40">
                      <Checkbox checked={chosenClasses.includes(name)} onCheckedChange={(v) => toggleClass(name, Boolean(v))} />
                      <span className="font-medium">Lớp {name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{info ? `${info.students} HV` : "chưa có HV"}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có học viên nào đăng ký tài khoản.</p>
            )}
            <div className="flex gap-2">
              <Input
                value={extraClass}
                onChange={(e) => setExtraClass(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addClass();
                  }
                }}
                placeholder="Thêm lớp chưa có học viên đăng ký"
                aria-label="Tên lớp"
                className="h-8"
              />
              <Button variant="outline" onClick={addClass} disabled={!extraClass.trim()}>
                <Plus data-icon="inline-start" />
                Thêm
              </Button>
              {chosenClasses.length > 0 && (
                <Button variant="ghost" onClick={() => setChosenClasses([])}>
                  <X data-icon="inline-start" />
                  Mọi lớp
                </Button>
              )}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Cách làm bài" />
          <div className="flex flex-col gap-5 p-5">
            <label className="flex items-start gap-3">
              <Switch checked={shuffle} onCheckedChange={setShuffle} disabled={draft.locked} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Trộn câu và phương án</span>
                <span className="text-xs text-muted-foreground">Mỗi học viên nhận thứ tự câu, thứ tự phương án riêng.</span>
              </span>
            </label>
            <RadioGroup value={reveal} onValueChange={(v) => setReveal(v as Reveal)} aria-label="Học viên xem gì sau khi nộp">
              {REVEALS.map((r) => (
                <FieldLabel key={r} htmlFor={`xem-${r}`}>
                  <Field orientation="horizontal">
                    <RadioGroupItem value={r} id={`xem-${r}`} />
                    <FieldContent>
                      <FieldTitle>{REVEAL_LABELS[r].label}</FieldTitle>
                      <FieldDescription>{REVEAL_LABELS[r].hint}</FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Câu hỏi" description="Chọn câu từ ngân hàng câu hỏi của môn. Câu được chép vào đề lúc lưu; sửa ngân hàng sau đó không làm đổi đề đã có người làm." />
        <div className="p-5">
          <QuestionPicker questions={questions} chapters={chapters} selected={keys} onChange={setKeys} disabled={draft.locked} />
        </div>
      </Panel>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:flex-row sm:items-center sm:px-8">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {keys.length} câu · {Number(duration) > 0 ? durationText(Number(duration)) : "—"} ·{" "}
            {draft.status === "da-giao" ? "Đề đang giao cho học viên" : "Lưu nháp thì học viên chưa thấy đề"}
          </p>
        )}
        {/* Chừa chỗ bên phải cho nút cuộn lên đầu trang của khu quản trị. */}
        <div className="flex gap-2 sm:ml-auto sm:mr-14">
          <Button variant="outline" onClick={() => router.back()} disabled={pending}>
            Hủy
          </Button>
          {draft.status === "nhap" && (
            <Button variant="outline" onClick={() => save("nhap")} disabled={pending}>
              <Save data-icon="inline-start" />
              Lưu nháp
            </Button>
          )}
          <Button onClick={() => save("da-giao")} disabled={pending || keys.length === 0}>
            {pending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            {draft.status === "da-giao" ? "Lưu thay đổi" : "Lưu và giao đề"}
          </Button>
        </div>
      </div>
    </div>
  );
}
