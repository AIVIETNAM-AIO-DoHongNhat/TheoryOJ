"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import type { ClassInfo } from "../server/stats";

const ALL = "__tat-ca__";

/** Ô tìm và chọn lớp, ghi vào đường dẫn (?q=, ?lop=) để trang máy chủ lọc và có thể gửi đường dẫn cho người khác. */
export function StudentFilters({ classes, showSearch = true }: { classes: ClassInfo[]; showSearch?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Gõ xong 300 ms mới lọc, để không tải lại sau từng ký tự.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => update("q", q.trim() || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại khi chữ trong ô đổi
  }, [q]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {showSearch && (
        <InputGroup className="h-10 bg-card sm:max-w-sm">
          <InputGroupAddon>{pending ? <Spinner /> : <Search />}</InputGroupAddon>
          <InputGroupInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã học viên hoặc họ tên"
            aria-label="Tìm học viên"
          />
        </InputGroup>
      )}
      <Select
        items={[{ value: ALL, label: "Tất cả các lớp" }, ...classes.map((c) => ({ value: c.name, label: `Lớp ${c.name} (${c.students})` }))]}
        value={params.get("lop") ?? ALL}
        onValueChange={(v) => update("lop", v === ALL ? null : (v as string))}
      >
        <SelectTrigger className="bg-card data-[size=default]:h-10 sm:w-56" aria-label="Lọc theo lớp">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={ALL}>Tất cả các lớp</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                Lớp {c.name} ({c.students})
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
