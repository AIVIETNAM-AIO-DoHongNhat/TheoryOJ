"use client";

import { Calculator } from "lucide-react";

import {
  Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { PERCENT, SYMBOL } from "@/domain/ktct/formulas";

import type { ChatMessage } from "../types";

type CalculatorPart = Extract<ChatMessage["parts"][number], { type: "tool-tinh_ktct" }>;

/** Phép tính do hệ thống thực hiện, để học viên đối chiếu với lời giải của mô hình. */
export function CalculatorTrace({ parts }: { parts: CalculatorPart[] }) {
  return (
    <Trace>
      {parts.map((part) => (
        <CalculatorLine key={part.toolCallId} part={part} />
      ))}
    </Trace>
  );
}

function CalculatorLine({ part }: { part: CalculatorPart }) {
  if (part.state === "output-error") {
    return (
      <TraceLine status="error">
        <TraceIcon><Calculator /></TraceIcon>
        <TraceTitle>Không tính được: {part.errorText}</TraceTitle>
      </TraceLine>
    );
  }
  if (part.state !== "output-available") {
    return (
      <TraceLine status="running">
        <TraceIcon><Calculator /></TraceIcon>
        <TraceTitle>Đang tính toán</TraceTitle>
      </TraceLine>
    );
  }
  const { ket_qua, cac_buoc, thieu_du_kien } = part.output;
  const summary = (part.input.can_tim ?? [])
    .filter((q) => ket_qua[q] !== undefined)
    .map((q) => `${SYMBOL[q]} = ${ket_qua[q]!.toLocaleString("vi-VN")}${PERCENT.has(q) ? " %" : ""}`)
    .join(" · ");
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <TraceLine>
          <TraceIcon><Calculator /></TraceIcon>
          <TraceTitle>{thieu_du_kien.length ? "Thiếu dữ kiện để tính" : "Đã tính bằng hệ thống"}</TraceTitle>
          {summary && <TraceDescription>{summary}</TraceDescription>}
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="flex flex-col gap-1 font-mono text-xs">
        {cac_buoc.map((s, i) => (
          <p key={i}>
            <span className="mr-2 text-primary">{String(i + 1).padStart(2, "0")}</span>
            {s}
          </p>
        ))}
        {thieu_du_kien.length > 0 && <p className="font-sans text-destructive">Còn thiếu: {thieu_du_kien.join(", ")}</p>}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}
