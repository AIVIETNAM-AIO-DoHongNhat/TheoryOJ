/**
 * Chép PDF học liệu từ content/ sang public/tai-lieu-goc/ để Vercel phục vụ như file tĩnh qua CDN.
 * Hàm serverless bị giới hạn kích thước phản hồi, còn file tĩnh thì không, và CDN hỗ trợ Range
 * (trình đọc PDF chỉ tải những trang đang xem, niên giám dài gần 16 MB).
 *
 * Chạy tự động trước `npm run build` (script "prebuild"), nhưng chỉ khi build trên Vercel hoặc đặt COPY_PDFS=1.
 * Bản Docker đọc thẳng content/ nên không cần.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
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

let count = 0;
let bytes = 0;
const pointers = [];
if (existsSync(content)) {
  for (const file of walk(content)) {
    if (!file.toLowerCase().endsWith(".pdf")) continue;
    // File Git LFS chưa được tải về chỉ là một đoạn văn bản nhỏ, build sẽ "thành công" nhưng PDF hỏng.
    if (readFileSync(file).subarray(0, 40).toString("utf8").startsWith("version https://git-lfs")) {
      pointers.push(relative(content, file));
      continue;
    }
    const dest = join(out, relative(content, file));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    count++;
    bytes += statSync(file).size;
  }
}

if (pointers.length) {
  console.error(`copy-pdfs: ${pointers.length} file PDF chỉ là con trỏ Git LFS, chưa có nội dung thật:\n  ${pointers.join("\n  ")}`);
  console.error("Bật Git LFS trong Vercel: Project Settings > Git > Git Large File Storage, rồi build lại.");
  process.exit(1);
}
console.log(`copy-pdfs: đã chép ${count} PDF (${(bytes / 1e6).toFixed(1)} MB) vào public/tai-lieu-goc/.`);
