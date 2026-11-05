/**
 * Chuẩn bị học liệu gốc cho bản build trên Vercel:
 *  1. File Git LFS chưa được tải về (chỉ là con trỏ nhỏ) thì tải bản thật từ GitHub, kiểm tra sha256, ghi đè tại chỗ.
 *     Nhờ vậy build không phụ thuộc vào công tắc Git LFS của Vercel. Repo công khai thì không cần khóa; repo riêng
 *     thì đặt biến GITHUB_TOKEN (quyền đọc nội dung).
 *  2. Chép PDF từ content/ sang public/tai-lieu-goc/ để Vercel phục vụ như file tĩnh qua CDN. Hàm serverless bị giới hạn
 *     kích thước phản hồi, còn file tĩnh thì không, và CDN hỗ trợ Range (trình đọc PDF chỉ tải những trang đang xem,
 *     niên giám dài gần 16 MB).
 *
 * Chạy tự động trước `npm run build` (script "prebuild"), nhưng chỉ khi build trên Vercel hoặc đặt COPY_PDFS=1.
 * Bản Docker đọc thẳng content/ nên không cần.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

if (!process.env.VERCEL && process.env.COPY_PDFS !== "1") {
  console.log("copy-pdfs: bỏ qua (không build trên Vercel).");
  process.exit(0);
}

const content = resolve(process.cwd(), "../../content");
const out = resolve(process.cwd(), "public/tai-lieu-goc");
rmSync(out, { recursive: true, force: true });

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Đọc con trỏ LFS: trả { oid, size } hoặc null nếu file là nội dung thật. */
function readPointer(file) {
  if (statSync(file).size > 1024) return null;
  const text = readFileSync(file, "utf8");
  if (!text.startsWith("version https://git-lfs")) return null;
  const oid = /^oid sha256:([0-9a-f]{64})$/m.exec(text)?.[1];
  const size = Number(/^size (\d+)$/m.exec(text)?.[1]);
  return oid && size ? { oid, size } : null;
}

const owner = process.env.VERCEL_GIT_REPO_OWNER;
const repo = process.env.VERCEL_GIT_REPO_SLUG;
const ref = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_REF || "main";

async function download(file, { oid, size }) {
  if (!owner || !repo) throw new Error("thiếu VERCEL_GIT_REPO_OWNER hoặc VERCEL_GIT_REPO_SLUG");
  const path = relative(resolve(content, ".."), file).split("\\").join("/");
  const url = `https://media.githubusercontent.com/media/${owner}/${repo}/${ref}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const headers = process.env.GITHUB_TOKEN ? { authorization: `token ${process.env.GITHUB_TOKEN}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${path}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length !== size) throw new Error(`${path}: kích thước ${buf.length} khác con trỏ (${size})`);
  if (createHash("sha256").update(buf).digest("hex") !== oid) throw new Error(`${path}: sha256 không khớp con trỏ`);
  writeFileSync(file, buf);
}

const failed = [];
if (existsSync(content)) {
  for (const file of walk(content)) {
    const pointer = readPointer(file);
    if (!pointer) continue;
    try {
      await download(file, pointer);
      console.log(`copy-pdfs: đã tải ${relative(content, file)} từ GitHub LFS (${(pointer.size / 1e6).toFixed(1)} MB).`);
    } catch (e) {
      failed.push(`${relative(content, file)}: ${e.message}`);
    }
  }
}

if (failed.length) {
  console.error(`copy-pdfs: ${failed.length} file Git LFS chưa có nội dung thật:\n  ${failed.join("\n  ")}`);
  console.error("Bật Git LFS trong Vercel (Project Settings > Git > Git Large File Storage), hoặc nếu repo riêng thì đặt GITHUB_TOKEN, rồi build lại.");
  process.exit(1);
}

let count = 0;
let bytes = 0;
if (existsSync(content)) {
  for (const file of walk(content)) {
    if (!file.toLowerCase().endsWith(".pdf")) continue;
    const dest = join(out, relative(content, file));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    count++;
    bytes += statSync(file).size;
  }
}
console.log(`copy-pdfs: đã chép ${count} PDF (${(bytes / 1e6).toFixed(1)} MB) vào public/tai-lieu-goc/.`);
