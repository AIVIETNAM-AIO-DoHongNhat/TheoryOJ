import fs from "node:fs";
import { Readable } from "node:stream";

import { docPath, getDoc } from "@/features/library/server/catalog";

const CONTENT_TYPES = {
  pdf: "application/pdf",
  md: "text/markdown; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Trả file gốc của tài liệu. Hỗ trợ Range để trình đọc PDF chỉ tải những trang đang xem
 * (niên giám thống kê dài 1.557 trang, gần 16 MB). Thêm ?tai=1 để tải về máy.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/tai-lieu/[slug]">) {
  const { slug } = await ctx.params;
  const doc = getDoc(slug);
  if (!doc) return new Response("Không tìm thấy tài liệu.", { status: 404 });

  const file = docPath(doc);
  const size = fs.statSync(file).size;
  const filename = encodeURIComponent(doc.file.split("/").pop()!);
  const download = new URL(req.url).searchParams.has("tai");
  const headers = new Headers({
    "Content-Type": CONTENT_TYPES[doc.format],
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
  });

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "bytes=-500" là 500 byte cuối file.
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream, { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { headers });
}
