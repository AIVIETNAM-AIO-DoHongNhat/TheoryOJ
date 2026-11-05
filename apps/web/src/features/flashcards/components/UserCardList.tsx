"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { editCard, removeCard } from "../actions";
import { CARD_BACK_MAX, CARD_FRONT_MAX, type Flashcard } from "../types";

/** Thẻ học viên tự tạo trong chương: sửa, xóa. Thẻ mới tạo bằng cách bôi đen trong trình đọc. */
export function UserCardList({ cards }: { cards: Flashcard[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      setError(null);
      try {
        await fn();
        setEditing(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không lưu được.");
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thẻ của tôi ({cards.length})</CardTitle>
        <CardDescription>Bôi đen một đoạn trong giáo trình hoặc văn kiện rồi chọn “Tạo thẻ” để thêm.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {cards.map((c) =>
          editing === c.id ? (
            <form
              key={c.id}
              className="flex flex-col gap-2 py-3"
              action={(form) => run(() => editCard({ id: c.id, front: String(form.get("front") ?? ""), back: String(form.get("back") ?? "") }))}
            >
              <Input name="front" defaultValue={c.front} required maxLength={CARD_FRONT_MAX} aria-label="Mặt trước" />
              <Textarea name="back" defaultValue={c.back} required maxLength={CARD_BACK_MAX} aria-label="Mặt sau" />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex justify-end gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  Lưu
                </Button>
              </div>
            </form>
          ) : (
            <div key={c.id} className="flex items-start gap-3 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-medium">{c.front}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{c.back}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c.id)} aria-label={`Sửa thẻ ${c.front}`}>
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label={`Xóa thẻ ${c.front}`}
                onClick={() => {
                  if (window.confirm("Xóa thẻ này cùng lịch ôn của nó?")) run(() => removeCard(c.id));
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ),
        )}
      </CardContent>
    </Card>
  );
}
