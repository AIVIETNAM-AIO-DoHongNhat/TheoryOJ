"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Quay lại trang trước; mở thẳng đường dẫn (không có lịch sử trong trang) thì về trang chủ. */
export function GoBackButton({
  className,
  variant = "outline",
  size = "lg",
  label = "Quay lại",
}: {
  className?: string;
  variant?: "outline" | "secondary" | "ghost";
  size?: "default" | "lg";
  label?: string;
}) {
  const router = useRouter();
  const back = () => {
    const sameSite = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (sameSite && window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <Button variant={variant} size={size} onClick={back} className={cn("group", className)}>
      <ArrowLeft data-icon="inline-start" className="opacity-60 transition-transform group-hover:-translate-x-0.5" aria-hidden />
      {label}
    </Button>
  );
}
