/**
 * Sinh hình minh họa trang đăng nhập, đăng ký (public/anh-khoa/nen-dang-nhap.svg, dùng ở AuthPage.tsx):
 * "Con đường chinh phục kiến thức". Chỉnh tọa độ, màu ở đây rồi chạy lại thay vì sửa tay file SVG.
 * Chạy từ apps/web: node scripts/gen-nen-dang-nhap.mjs
 */
import { writeFileSync } from "node:fs";

const out = process.argv[2] ?? "public/anh-khoa/nen-dang-nhap.svg";
const f = (n) => Math.round(n * 10) / 10;

// Điểm của con đường: chân núi (khuất sau thẻ) → 6 cột mốc chương → đỉnh.
const START = [440, 1020];
const M = [
  [318, 728],
  [486, 650],
  [338, 574],
  [458, 503], // đang học
  [366, 438],
  [428, 380],
];
const PEAK = [400, 326];
const PTS = [START, [372, 860], ...M, PEAK];
const CURRENT = 3; // chỉ số cột mốc đang học
const curIdx = 2 + CURRENT; // vị trí trong PTS

// Catmull-Rom → Bézier bậc ba.
function seg(i) {
  const p0 = PTS[Math.max(i - 1, 0)], p1 = PTS[i], p2 = PTS[i + 1], p3 = PTS[Math.min(i + 2, PTS.length - 1)];
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
  const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  return `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
}
const path = (from, to) => `M${PTS[from][0]} ${PTS[from][1]} ` + Array.from({ length: to - from }, (_, k) => seg(from + k)).join(" ");
const roadAll = path(0, PTS.length - 1);
const roadDone = path(0, curIdx);
const roadAhead = path(curIdx, PTS.length - 1);

const STAR = [400, 222];
const MOUNT = "M-20 820 C60 720 150 600 230 520 C270 480 300 470 330 420 C356 376 380 330 400 300 C420 330 440 360 470 390 C500 420 530 430 560 420 C600 410 640 470 700 560 C740 620 780 680 820 720 L820 1000 L-20 1000 Z";
function star(cx, cy, R, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    p.push(`${f(cx + rad * Math.cos(a))},${f(cy + rad * Math.sin(a))}`);
  }
  return p.join(" ");
}

const milestones = M.map(([x, y], i) => {
  const n = i + 1;
  if (i < CURRENT) {
    return `
    <g>
      <circle cx="${x}" cy="${y}" r="17" fill="#22c55e" stroke="#bbf7d0" stroke-width="2"/>
      <path d="M${x - 7} ${y + 0.5} l5 5 l9.5 -10" fill="none" stroke="#04170b" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
  }
  if (i === CURRENT) {
    return `
    <g>
      <circle class="pulse" cx="${x}" cy="${y}" r="22" fill="none" stroke="#86efac" stroke-width="2"/>
      <circle class="pulse late" cx="${x}" cy="${y}" r="22" fill="none" stroke="#86efac" stroke-width="2"/>
      <circle cx="${x}" cy="${y}" r="34" fill="url(#curGlow)"/>
      <circle cx="${x}" cy="${y}" r="21" fill="#f0fdf4" stroke="#4ade80" stroke-width="3"/>
      <text x="${x}" y="${y + 7}" text-anchor="middle" class="num" fill="#14532d">${n}</text>
    </g>`;
  }
  return `
    <g opacity="${i === M.length - 1 ? 0.6 : 0.8}">
      <circle cx="${x}" cy="${y}" r="14" fill="#0b3b20" stroke="#86efac" stroke-opacity="0.55" stroke-width="2"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" class="num small" fill="#86efac">${n}</text>
    </g>`;
}).join("");

// Sao trời: vị trí cố định để hình không đổi giữa các lần sinh.
const dots = [
  [92, 96, 2.2], [168, 182, 1.6], [250, 70, 1.4], [560, 92, 1.8], [668, 158, 2.2], [720, 64, 1.4],
  [128, 280, 1.4], [700, 300, 1.6], [56, 420, 1.8], [752, 470, 1.4], [612, 210, 1.2], [300, 150, 1.2],
];
const sky = dots.map(([x, y, r], i) =>
  `<circle cx="${x}" cy="${y}" r="${r}" class="${i % 3 === 0 ? "tw" : i % 3 === 1 ? "tw d1" : "tw d2"}"/>`).join("");

// Biểu đồ 6 chương trên thẻ: 3 cột đầy, cột đang học một nửa, 2 cột trống.
const bars = [1, 1, 1, 0.5, 0, 0].map((v, i) => {
  const x = 22 + i * 19, H = 52, base = 80;
  const track = `<rect x="${x}" y="${base - H}" width="11" height="${H}" rx="5.5" fill="#ffffff" fill-opacity="0.08"/>`;
  const h = v === 0 ? 0 : Math.max(H * v, 11);
  const fill = v === 1 ? "#4ade80" : "#bbf7d0";
  return track + (h ? `<rect x="${x}" y="${base - h}" width="11" height="${h}" rx="5.5" fill="${fill}"/>` : "");
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Con đường lên đỉnh núi qua sáu cột mốc chương, ba chương đầu đã hoàn thành, chương bốn đang học, ngôi sao vàng trên đỉnh">
  <!--
    Con đường chinh phục kiến thức: sáu cột mốc là sáu chương. Đoạn đã đi sáng lên, đoạn phía trước nét đứt;
    ngôi sao trên đỉnh là mục tiêu, bong bóng chat cạnh chặng đang học là trợ lý. Phần dưới để tối vì có thẻ lợi ích
    đè lên (AuthPage.tsx). Sinh bằng script, chỉnh tọa độ trong script rồi sinh lại thay vì sửa tay.
  -->
  <style>
    .num { font: 700 20px "Roboto Condensed", "Segoe UI", Roboto, Arial, sans-serif; }
    .num.small { font-size: 14px; }
    .tw { fill: #d9f99d; animation: tw 4s ease-in-out infinite; }
    .tw.d1 { animation-delay: -1.3s; fill: #bbf7d0; }
    .tw.d2 { animation-delay: -2.6s; fill: #ffffff; }
    @keyframes tw { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.85; } }
    .pulse { transform-box: fill-box; transform-origin: center; animation: pulse 2.8s cubic-bezier(0.2, 0.6, 0.3, 1) infinite; }
    .pulse.late { animation-delay: 1.4s; }
    @keyframes pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.1); opacity: 0; } }
    .float { animation: float 7s ease-in-out infinite; }
    .float.b { animation-duration: 8s; animation-delay: -3s; }
    .float.c { animation-duration: 9s; animation-delay: -5s; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .ahead { animation: march 1.6s linear infinite; }
    @keyframes march { to { stroke-dashoffset: -26; } }
    .rays { transform-box: fill-box; transform-origin: center; animation: spin 60s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .typing circle { animation: typing 1.4s ease-in-out infinite; }
    .typing circle:nth-child(2) { animation-delay: 0.2s; }
    .typing circle:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing { 0%, 60%, 100% { opacity: 0.35; } 30% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0c3d22"/>
      <stop offset="0.5" stop-color="#083119"/>
      <stop offset="1" stop-color="#052e16"/>
    </linearGradient>
    <radialGradient id="dawn" cx="400" cy="250" r="420" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fde68a" stop-opacity="0.34"/>
      <stop offset="0.28" stop-color="#bef264" stop-opacity="0.14"/>
      <stop offset="0.6" stop-color="#22c55e" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#22c55e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="faceL" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f8f55"/>
      <stop offset="0.45" stop-color="#14532d"/>
      <stop offset="1" stop-color="#062d17"/>
    </linearGradient>
    <linearGradient id="faceR" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c6b3c"/>
      <stop offset="0.45" stop-color="#0d4022"/>
      <stop offset="1" stop-color="#052812"/>
    </linearGradient>
    <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#14532d" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#052e16" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0f4a28"/>
      <stop offset="1" stop-color="#041f0f"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fef3c7"/>
      <stop offset="0.45" stop-color="#fcd34d"/>
      <stop offset="1" stop-color="#d97706"/>
    </linearGradient>
    <radialGradient id="starGlow">
      <stop offset="0" stop-color="#fde68a" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fde68a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="curGlow">
      <stop offset="0" stop-color="#86efac" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#86efac" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.05"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Bầu trời lúc rạng đông, sáng nhất sau đỉnh núi -->
  <rect width="800" height="1000" fill="url(#sky)"/>
  <rect width="800" height="1000" fill="url(#dawn)"/>
  <g>${sky}</g>

  <!-- Vòng sáng quanh ngôi sao -->
  <g fill="none" stroke="#fde68a">
    <circle cx="${STAR[0]}" cy="${STAR[1]}" r="92" stroke-opacity="0.16"/>
    <circle cx="${STAR[0]}" cy="${STAR[1]}" r="150" stroke-opacity="0.09"/>
    <circle cx="${STAR[0]}" cy="${STAR[1]}" r="215" stroke-opacity="0.05"/>
  </g>

  <!-- Dãy đồi xa -->
  <path d="M-20 640 C60 600 130 548 200 560 C250 568 290 610 330 660 L330 1000 L-20 1000 Z" fill="url(#hillFar)"/>
  <path d="M820 610 C740 570 670 530 600 548 C550 560 510 600 470 650 L470 1000 L820 1000 Z" fill="url(#hillFar)"/>

  <!-- Dãy núi: đỉnh chính ở giữa, vai núi hai bên; khối chung trong bóng, mặt trái đón nắng -->
  <path d="${MOUNT}" fill="url(#faceR)"/>
  <path d="M400 300 C380 330 356 376 330 420 C300 470 270 480 230 520 C150 600 60 720 -20 820 L-20 1000 L384 1000 C404 860 384 760 402 640 C414 560 392 470 408 400 C414 360 404 330 400 300 Z" fill="url(#faceL)"/>
  <!-- Vai núi phải hơi sáng hơn sườn khuất -->
  <path d="M560 420 C600 410 640 470 700 560 C740 620 780 680 820 720 L820 1000 L640 1000 C660 820 600 640 560 420 Z" fill="#1c6b3c" fill-opacity="0.2"/>
  <!-- Viền núi bắt ánh bình minh -->
  <path d="M-20 820 C60 720 150 600 230 520 C270 480 300 470 330 420 C356 376 380 330 400 300 C420 330 440 360 470 390 C500 420 530 430 560 420 C600 410 640 470 700 560" fill="none" stroke="#d9f99d" stroke-opacity="0.28" stroke-width="1.6" stroke-linecap="round"/>
  <!-- Mũ tuyết -->
  <path d="M400 300 C394 309 387 319 380 330 L389 327 L394 335 L401 327 L409 337 L415 330 L424 335 C416 323 408 311 400 300 Z" fill="#f0fdf4" fill-opacity="0.85"/>

  <!-- Con đường -->
  <path d="${roadAll}" fill="none" stroke="#021a0b" stroke-opacity="0.45" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${roadAll}" fill="none" stroke="#86efac" stroke-opacity="0.1" stroke-width="11" stroke-linecap="round"/>
  <path class="ahead" d="${roadAhead}" fill="none" stroke="#86efac" stroke-opacity="0.55" stroke-width="3" stroke-dasharray="2 11" stroke-linecap="round"/>
  <path d="${roadDone}" fill="none" stroke="#4ade80" stroke-width="9" stroke-opacity="0.45" stroke-linecap="round" filter="url(#soft)"/>
  <path id="done" d="${roadDone}" fill="none" stroke="#bbf7d0" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Đốm sáng chạy dọc đoạn đường đã đi -->
  <circle r="5" fill="#ffffff">
    <animateMotion dur="5s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
      <mpath href="#done"/>
    </animateMotion>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="5s" repeatCount="indefinite"/>
  </circle>

  <!-- Cột mốc chương -->
  ${milestones}

  <!-- Ngôi sao trên đỉnh -->
  <circle cx="${STAR[0]}" cy="${STAR[1]}" r="96" fill="url(#starGlow)"/>
  <g class="rays" stroke="#fde68a" stroke-linecap="round" stroke-opacity="0.55">
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const r1 = 62, r2 = i % 2 ? 74 : 84;
      return `<line x1="${f(STAR[0] + r1 * Math.cos(a))}" y1="${f(STAR[1] + r1 * Math.sin(a))}" x2="${f(STAR[0] + r2 * Math.cos(a))}" y2="${f(STAR[1] + r2 * Math.sin(a))}" stroke-width="${i % 2 ? 2 : 3}"/>`;
    }).join("")}
  </g>
  <polygon points="${star(STAR[0], STAR[1], 48, 20)}" fill="url(#gold)" stroke="#fef3c7" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="${star(STAR[0], STAR[1] - 2, 22, 9)}" fill="#fffbeb" fill-opacity="0.45"/>
  <line x1="${STAR[0]}" y1="${STAR[1] + 50}" x2="${STAR[0]}" y2="${PEAK[1] - 6}" stroke="#fde68a" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>

  <!-- Thẻ: tiến độ 6 chương -->
  <g class="float" filter="url(#shadow)">
    <g transform="translate(80 300)">
      <rect width="152" height="104" rx="20" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.18"/>
      ${bars}
      <rect x="22" y="88" width="106" height="2" rx="1" fill="#ffffff" fill-opacity="0.12"/>
    </g>
  </g>

  <!-- Thẻ: giáo trình -->
  <g class="float c" filter="url(#shadow)">
    <g transform="translate(96 520) rotate(-6)">
      <rect width="128" height="88" rx="20" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.18"/>
      <g transform="translate(24 22)" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M40 8 C30 2 14 2 2 6 L2 42 C14 38 30 38 40 44 Z" fill="#f0fdf4" fill-opacity="0.9" stroke="#bbf7d0" stroke-width="2"/>
        <path d="M40 8 C50 2 66 2 78 6 L78 42 C66 38 50 38 40 44 Z" fill="#dcfce7" fill-opacity="0.9" stroke="#bbf7d0" stroke-width="2"/>
        <path d="M10 15 C18 13 26 13 33 16 M10 23 C18 21 26 21 33 24 M10 31 C16 29 22 29 27 31" stroke="#15803d" stroke-opacity="0.6" stroke-width="2.4"/>
        <path d="M47 16 C54 13 62 13 70 15 M47 24 C54 21 62 21 70 23" stroke="#15803d" stroke-opacity="0.6" stroke-width="2.4"/>
        <path d="M58 40 L58 54 L63 50 L68 54 L68 39" fill="#fbbf24" stroke="#fbbf24" stroke-width="1.5"/>
      </g>
    </g>
  </g>

  <!-- Bong bóng trợ lý, chỉ vào chặng đang học -->
  <g class="float b" filter="url(#shadow)">
    <g transform="translate(540 420)">
      <path d="M20 0 H140 A20 20 0 0 1 160 20 V48 A20 20 0 0 1 140 68 H40 L14 88 L20 68 A20 20 0 0 1 0 48 V20 A20 20 0 0 1 20 0 Z" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.2"/>
      <g class="typing" fill="#bbf7d0">
        <circle cx="56" cy="34" r="7"/>
        <circle cx="80" cy="34" r="7"/>
        <circle cx="104" cy="34" r="7"/>
      </g>
    </g>
  </g>

  <!-- Thẻ: vòng tiến độ 3/6 -->
  <g class="float c" filter="url(#shadow)">
    <g transform="translate(600 262)">
      <rect width="112" height="112" rx="28" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.18"/>
      <circle cx="56" cy="56" r="32" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="8"/>
      <circle cx="56" cy="56" r="32" fill="none" stroke="#4ade80" stroke-width="8" stroke-linecap="round"
        stroke-dasharray="${f(Math.PI * 64 * 0.5)} 400" transform="rotate(-90 56 56)"/>
      <text x="56" y="63" text-anchor="middle" class="num" fill="#f0fdf4">3/6</text>
    </g>
  </g>

  <!-- Đồi gần, che chân đường và làm nền tối cho thẻ lợi ích -->
  <path d="M-20 860 C120 800 260 790 380 830 C500 870 640 850 820 790 L820 1000 L-20 1000 Z" fill="url(#hillNear)"/>
</svg>
`;
writeFileSync(out, svg);
console.log("ok", svg.length);
