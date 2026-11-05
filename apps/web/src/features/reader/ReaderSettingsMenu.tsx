"use client";

import { Check, Minus, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  DEFAULTS, FONT_LABELS, FONTS, SIZES, THEME_LABELS, THEMES, useReaderSettings, WIDTH_LABELS, WIDTHS,
  type ReaderSettings, type ReaderTheme,
} from "./settings";

const SWATCH: Record<ReaderTheme, string> = {
  sang: "bg-white text-[#0a1a10]",
  giay: "bg-[#f6efdc] text-[#3b2f1e]",
  toi: "bg-[#14181a] text-[#e6ece8]",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value, options, labels, onChange, label,
}: { value: T; options: readonly T[]; labels: Record<T, string>; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value === o ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

/** Nút chọn nền, kiểu chữ, cỡ chữ, độ rộng dòng. `text` = false cho PDF (không đổi được kiểu chữ, cỡ chữ). */
export function ReaderSettingsMenu({ text = true, className }: { text?: boolean; className?: string }) {
  const [s, set] = useReaderSettings();
  const isDefault = (Object.keys(DEFAULTS) as (keyof ReaderSettings)[]).every((k) => s[k] === DEFAULTS[k]);
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="sm" className={className} aria-label="Tuỳ chỉnh giao diện đọc" />}>
        <SlidersHorizontal data-icon="inline-start" />
        <span className="hidden sm:inline">Giao diện</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-5 p-4">
        <PopoverHeader>
          <PopoverTitle>Giao diện đọc</PopoverTitle>
        </PopoverHeader>

        <Row label="Nền">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Nền">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={s.theme === t}
                onClick={() => set({ theme: t })}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  SWATCH[t],
                  s.theme === t ? "border-primary ring-2 ring-primary/40" : "border-border",
                )}
              >
                <span className="text-base font-semibold leading-none">Aa</span>
                {THEME_LABELS[t]}
                {s.theme === t && <Check className="absolute top-1 right-1 size-3.5 text-primary" aria-hidden />}
              </button>
            ))}
          </div>
        </Row>

        {text && (
          <>
            <Row label="Cỡ chữ">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" disabled={s.size <= 0} onClick={() => set({ size: s.size - 1 })} aria-label="Giảm cỡ chữ">
                  <Minus />
                </Button>
                <div className="flex flex-1 items-center justify-center gap-1" aria-live="polite">
                  {SIZES.map((_, i) => (
                    <span key={i} className={cn("h-1.5 w-full max-w-8 rounded-full", i <= s.size ? "bg-primary" : "bg-muted")} />
                  ))}
                </div>
                <Button variant="outline" size="icon-sm" disabled={s.size >= SIZES.length - 1} onClick={() => set({ size: s.size + 1 })} aria-label="Tăng cỡ chữ">
                  <Plus />
                </Button>
              </div>
            </Row>
            <Row label="Kiểu chữ">
              <Segmented label="Kiểu chữ" value={s.font} options={FONTS} labels={FONT_LABELS} onChange={(font) => set({ font })} />
            </Row>
            <Row label="Độ rộng dòng">
              <Segmented label="Độ rộng dòng" value={s.width} options={WIDTHS} labels={WIDTH_LABELS} onChange={(width) => set({ width })} />
            </Row>
          </>
        )}

        <Button variant="ghost" size="sm" className="self-start" disabled={isDefault} onClick={() => set(DEFAULTS)}>
          <RotateCcw data-icon="inline-start" />
          Về mặc định
        </Button>
      </PopoverContent>
    </Popover>
  );
}
