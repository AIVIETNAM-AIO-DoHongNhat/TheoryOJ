import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { MinhMascot } from "@/components/brand/MinhMascot";

// Ảnh xem trước khi gửi liên kết (Messenger, Zalo, Facebook): linh vật Minh và tên trang.
// Thiếu ảnh này thì các ứng dụng tự lấy ảnh lớn đầu tiên trên trang chủ.
export const alt = "Minh, trợ lý học tập Lý luận chính trị của TheoryOJ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FEATURES = ["Giáo trình", "Trắc nghiệm", "Tự luận", "Phản bác"];

export default async function OpenGraphImage() {
  // Font đi kèm mã nguồn (Roboto, giấy phép OFL) để chữ tiếng Việt đủ dấu, không phụ thuộc mạng.
  // Đường dẫn viết cố định để bản dựng chỉ gói kèm ba file này, không quét cả dự án.
  const [heading, body, logo] = await Promise.all([
    readFile(join(process.cwd(), "src/app/_og/RobotoCondensed-Bold.ttf")),
    readFile(join(process.cwd(), "src/app/_og/Roboto-Medium.ttf")),
    readFile(join(process.cwd(), "public/brand/logo-hvannd.png")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0b3b20 0%, #14532d 55%, #15803d 100%)",
          fontFamily: "Roboto",
          color: "#f0fdf4",
        }}
      >
        {/* Cột chữ. */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 72px", width: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse chỉ nhận thẻ img. */}
            <img src={`data:image/png;base64,${logo.toString("base64")}`} width={56} height={56} alt="" />
            <div style={{ display: "flex", flexDirection: "column", fontSize: 22, lineHeight: 1.3, color: "#bbf7d0" }}>
              <span>Khoa LLCT&KHXHNV</span>
              <span>Học viện An ninh nhân dân</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span style={{ fontFamily: "Roboto Condensed", fontSize: 104, lineHeight: 1, letterSpacing: -1, color: "#ffffff" }}>
              TheoryOJ
            </span>
            <span style={{ fontFamily: "Roboto Condensed", fontSize: 46, lineHeight: 1.15, color: "#dcfce7" }}>
              Trợ lý học tập Lý luận chính trị
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {FEATURES.map((f) => (
              <span
                key={f}
                style={{
                  display: "flex",
                  padding: "9px 20px",
                  borderRadius: 999,
                  fontSize: 23,
                  background: "rgba(255,255,255,0.1)",
                  border: "1.5px solid rgba(134,239,172,0.45)",
                  color: "#f0fdf4",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Linh vật trên nền tròn sáng, kèm lời chào. */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
          <div
            style={{
              position: "absolute",
              width: 440,
              height: 440,
              borderRadius: 999,
              background: "radial-gradient(circle, #f0fdf4 0%, #dcfce7 62%, rgba(220,252,231,0) 72%)",
            }}
          />
          <div style={{ display: "flex", marginTop: 50 }}>
            <MinhMascot size={400} />
          </div>
          <div
            style={{
              position: "absolute",
              top: 70,
              right: 48,
              display: "flex",
              padding: "14px 24px",
              borderRadius: 24,
              background: "#ffffff",
              color: "#14532d",
              fontSize: 28,
              boxShadow: "0 10px 30px rgba(10,26,16,0.25)",
            }}
          >
            Chào đồng chí!
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Roboto Condensed", data: heading, weight: 700, style: "normal" },
        { name: "Roboto", data: body, weight: 500, style: "normal" },
      ],
    },
  );
}
