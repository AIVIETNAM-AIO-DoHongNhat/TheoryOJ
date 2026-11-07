import path from "node:path";

import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
// Vercel đặt VERCEL=1 khi build. Bản Docker dùng output "standalone" và đọc content/ qua CONTENT_DIR.
const onVercel = Boolean(process.env.VERCEL);

// Header bảo mật (PLAN.md mục 9). HSTS do Caddy đặt vì chỉ có nghĩa trên HTTPS.
// Next.js chèn script nội tuyến khi hydrate nên cần 'unsafe-inline'; pdf.js cần worker blob và WebAssembly.
// Tab Video của Thư viện (/thu-vien/video) nhúng trình phát Facebook và YouTube trong iframe (src/features/video/embed.ts), bìa video lấy ảnh thu nhỏ từ i.ytimg.com.
// web.facebook.com là bản Facebook chuyển hướng tới ở một số mạng.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.facebook.com https://web.facebook.com https://www.youtube-nocookie.com https://www.youtube.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  /* config options here */
  // Bản Docker chạy `node server.js` trong container (apps/web/Dockerfile). Vercel tự đóng gói nên không đặt.
  output: onVercel ? undefined : "standalone",
  // Học liệu nằm ở content/ ngoài thư mục apps/web, phải đưa vào bundle thì hàm serverless mới đọc được lúc chạy
  // (manifest, ngân hàng câu hỏi, thẻ ghi nhớ, bài viết, DOCX). Bỏ content/*/_goc (bản gốc .doc, không dùng).
  ...(onVercel && {
    outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
    outputFileTracingIncludes: { "/**": ["../../content/**/*"] },
    outputFileTracingExcludes: { "/**": ["../../content/**/_goc/**", "../../content/**/.gitkeep"] },
  }),
  // Cho phép build thử ra thư mục khác để không đè lên .next của `next dev` đang chạy.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Hoạt động luyện chuyển từ nhánh Học liệu sang nhánh Ôn tập (src/features/review/paths.ts); giữ link cũ còn chạy.
  async redirects() {
    return [
      {
        source: "/mon/:mon/chuong/:so/:hoatDong(the-ghi-nho|trac-nghiem|bai-tap)",
        destination: "/on-tap/:mon/chuong/:so/:hoatDong",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
