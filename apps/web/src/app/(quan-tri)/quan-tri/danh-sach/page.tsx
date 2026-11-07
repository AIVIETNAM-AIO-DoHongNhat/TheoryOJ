import { IdCard } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminHeading, dateTime, timeAgo } from "@/features/admin/components/AdminHeading";
import { Panel, TH } from "@/features/admin/components/AdminUi";
import { StudentFilters } from "@/features/admin/components/StudentFilters";
import { RemoveRosterButton, RosterToolbar } from "@/features/roster/components/RosterActions";
import { listRoster, rosterClasses } from "@/features/roster/server/roster";
import { requireTeacher } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Danh sách lớp · Quản trị" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Roster({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const params = await searchParams;
  const className = one(params.lop) ?? null;
  const q = one(params.q)?.trim().toLocaleLowerCase("vi") ?? "";
  const [classes, all] = await Promise.all([rosterClasses(), listRoster(className)]);
  const rows = q ? all.filter((r) => r.studentCode.toLowerCase().includes(q) || r.fullName.toLocaleLowerCase("vi").includes(q)) : all;
  const registered = rows.filter((r) => r.registered).length;
  const now = new Date();

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <StudentFilters classes={classes} />
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{rows.length}</span> học viên
          {className ? ` · lớp ${className}` : ""} · <span className="font-semibold text-foreground tabular-nums">{registered}</span> đã đăng ký
        </span>
      </div>

      {rows.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IdCard />
            </EmptyMedia>
            <EmptyTitle>{all.length ? "Không có học viên phù hợp" : "Chưa có danh sách học viên"}</EmptyTitle>
            <EmptyDescription>
              Học viên chỉ đăng ký được khi mã có trong danh sách. Bấm &ldquo;Nhập danh sách&rdquo; và dán ba cột mã, họ tên, lớp chép từ Excel.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(TH, "pl-5")}>Mã học viên</TableHead>
              <TableHead className={TH}>Họ và tên</TableHead>
              <TableHead className={TH}>Lớp</TableHead>
              <TableHead className={TH}>Tài khoản</TableHead>
              <TableHead className={cn(TH, "w-12 pr-4")} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.studentCode}>
                <TableCell className="py-2.5 pl-5 font-mono text-xs">{r.studentCode}</TableCell>
                <TableCell className="font-medium">{r.fullName}</TableCell>
                <TableCell>
                  <span className="inline-flex h-6 items-center rounded-md border bg-background px-2 text-xs font-medium">{r.className}</span>
                </TableCell>
                <TableCell className="text-xs">
                  {r.registered ? (
                    <span className="text-primary" title={dateTime(r.lastLoginAt)}>
                      Đã đăng ký{r.lastLoginAt ? ` · vào ${timeAgo(r.lastLoginAt, now)}` : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Chưa đăng ký</span>
                  )}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <RemoveRosterButton studentCode={r.studentCode} fullName={r.fullName} registered={r.registered} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

export default function RosterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <AdminHeading
        overline="Theo dõi"
        title="Danh sách lớp"
        description="Chỉ mã có trong danh sách mới đăng ký được tài khoản. Họ tên và lớp của tài khoản lấy theo danh sách, học viên không tự đổi lớp được; nhập lại danh sách để chuyển lớp."
        actions={<RosterToolbar />}
      />
      <Suspense fallback={<Skeleton className="h-[28rem] rounded-2xl" />}>
        <Roster searchParams={searchParams} />
      </Suspense>
    </>
  );
}
