"use client";

import { BookMarked, Check, ChevronDown, GraduationCap } from "lucide-react";

import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupButton } from "@/components/ui/input-group";
import { type Chapter, SUBJECTS } from "@/config/subjects";
import { cn } from "@/lib/utils";

import { MODE_ICONS } from "../mode-icons";
import { MODES, type ModeId } from "../modes";

const trigger = "h-8 gap-1.5 rounded-full px-3 text-[13px] font-medium text-foreground/80 data-popup-open:bg-muted";

/** Chọn môn học. Môn chưa mở vẫn hiện, bị khóa, để học viên thấy lộ trình. */
export function SubjectMenu({ value, onChange }: { value: string; onChange: (subject: string) => void }) {
  const current = SUBJECTS.find((s) => s.id === value)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<InputGroupButton variant="ghost" size="sm" className={trigger} aria-label="Môn học" />}>
        <GraduationCap className="text-primary" />
        {current.shortName}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-80 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Môn học</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as string)}>
            {SUBJECTS.map((s) => (
              <DropdownMenuRadioItem key={s.id} value={s.id} disabled={!s.active} closeOnClick className="items-start rounded-lg py-2.5 pr-9 pl-2.5">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.active ? `${s.chapters.length} chương` : "Sắp triển khai"}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Chọn chế độ trả lời, đặt trong thanh công cụ của ô nhập. Chỉ hiện các chế độ môn đang chọn hỗ trợ. */
export function ModeMenu({ modes, value, onChange }: { modes: ModeId[]; value: ModeId; onChange: (mode: ModeId) => void }) {
  const Icon = MODE_ICONS[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<InputGroupButton variant="ghost" size="sm" className={trigger} aria-label="Chế độ trả lời" />}>
        <Icon className="text-primary" />
        <span className="max-w-36 truncate sm:max-w-none">{MODES[value].label}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-80 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Chế độ trả lời</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as ModeId)}>
            {modes.map((id) => {
              const ItemIcon = MODE_ICONS[id];
              return (
                <DropdownMenuRadioItem key={id} value={id} closeOnClick className="items-start gap-3 rounded-lg py-2.5 pr-9 pl-2.5">
                  <ItemIcon className="mt-0.5 text-primary" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{MODES[id].label}</span>
                    <span className="text-xs text-muted-foreground">{MODES[id].description}</span>
                  </span>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Giới hạn phạm vi chương. Không chọn chương nào nghĩa là tìm trong cả giáo trình. */
export function ChapterMenu({
  chapters,
  value,
  onChange,
}: {
  chapters: Chapter[];
  value: number[];
  onChange: (chapters: number[]) => void;
}) {
  const label = value.length === 0 ? "Tất cả chương" : value.length <= 3 ? `Chương ${value.join(", ")}` : `${value.length} chương`;
  const toggle = (n: number, checked: boolean) =>
    onChange((checked ? [...value, n] : value.filter((x) => x !== n)).sort((a, b) => a - b));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<InputGroupButton variant="ghost" size="sm" className={cn(trigger, value.length > 0 && "text-primary")} aria-label="Phạm vi chương" />}
      >
        <BookMarked className={value.length ? "text-primary" : "opacity-70"} />
        {label}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-96 max-w-[calc(100vw-2rem)] p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Phạm vi chương</DropdownMenuLabel>
          {chapters.map((c) => (
            <DropdownMenuCheckboxItem
              key={c.number}
              checked={value.includes(c.number)}
              onCheckedChange={(checked) => toggle(c.number, checked)}
              className="items-start gap-3 rounded-lg py-2 pl-2.5"
            >
              <span className="w-5 shrink-0 font-heading font-bold text-primary">{c.number}</span>
              <span className="leading-snug">{c.title}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange([])} disabled={value.length === 0} className="rounded-lg py-2 pl-2.5">
          <Check className="opacity-70" />
          Tìm trong tất cả chương
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
