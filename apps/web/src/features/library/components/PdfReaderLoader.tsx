"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import type { PdfReaderProps } from "./PdfReader";

// pdf.js cần window, không render được ở server.
const PdfReader = dynamic(() => import("./PdfReader").then((m) => m.PdfReader), {
  ssr: false,
  loading: () => <Skeleton className="min-h-0 flex-1 rounded-xl" />,
});

export function PdfReaderLoader(props: PdfReaderProps) {
  return <PdfReader {...props} />;
}
