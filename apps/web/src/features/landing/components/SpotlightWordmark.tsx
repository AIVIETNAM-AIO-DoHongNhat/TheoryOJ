"use client";

import { useEffect, useId, useRef } from "react";

import { cn } from "@/lib/utils";

/** Khung vẽ của chữ, tính theo đơn vị viewBox. Chữ luôn được kéo vừa khít bề ngang nhờ `textLength`. */
const W = 1000;
const H = 160;
const TEXT = "LLCT&KHXHNV";

/** Khoảng cách (px) quanh chữ mà đèn đã bắt đầu để ý con trỏ; càng lại gần đèn càng sáng. */
const REACH = 160;
/** Độ sáng khi không có con trỏ ở gần. */
const IDLE = 0.38;
/** Hằng số thời gian (giây) của độ trễ: bám con trỏ nhanh, tự trôi thì chậm, độ sáng đổi vừa phải. */
const TAU_FOLLOW = 0.11;
const TAU_DRIFT = 0.7;
const TAU_LIGHT = 0.3;
/** Tự trôi: chờ một nhịp sau khi con trỏ rời đi rồi mới đi tiếp, tốc độ tính theo đơn vị viewBox mỗi giây. */
const DRIFT_DELAY = 0.9;
const DRIFT_SPEED = 85;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);

/**
 * Chữ tên khoa cỡ lớn, kiểu đèn rọi. Chữ chìm chỉ khác nền một chút; nơi đèn chiếu tới thì hiện màu chủ đạo, gồm
 * lõi đậm và quầng nhạt, kèm vệt sáng hắt lên nền sau chữ.
 *
 * Cách đèn đi: con trỏ vào gần chữ thì đèn bám theo và sáng dần theo khoảng cách. Con trỏ rời đi thì đèn dịu lại tại
 * chỗ, một nhịp sau trôi chậm tiếp theo hướng vừa đi, chạm mép thì quay đầu. Trên màn hình cảm ứng, đèn theo ngón tay
 * khi chạm hoặc kéo. Bật giảm chuyển động thì đèn đứng giữa chữ và chỉ dời theo con trỏ, không tự trôi.
 * Màu lấy từ token theme nên dùng được cả nền sáng lẫn nền tối.
 */
export function SpotlightWordmark({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<SVGRadialGradientElement>(null);
  const haloRef = useRef<SVGRadialGradientElement>(null);
  const litRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Tọa độ con trỏ trên màn hình; quy đổi sang viewBox trong mỗi khung để vẫn đúng khi trang cuộn.
    let client: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => { client = { x: e.clientX, y: e.clientY }; };
    const onEnd = (e: PointerEvent) => { if (e.pointerType !== "mouse") client = null; };
    const onOut = (e: PointerEvent) => { if (!e.relatedTarget) client = null; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onEnd, { passive: true });
    window.addEventListener("pointercancel", onEnd, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });

    const pos = { x: W / 2, y: H / 2 };
    let light = IDLE;
    let drift = { x: W / 2, dir: 1 };
    let away = DRIFT_DELAY;
    let last = 0;
    let frame = 0;
    let visible = false;

    const read = () => {
      if (!client) return null;
      const r = wrap.getBoundingClientRect();
      const dx = Math.max(r.left - client.x, 0, client.x - r.right);
      const dy = Math.max(r.top - client.y, 0, client.y - r.bottom);
      const dist = Math.hypot(dx, dy);
      if (dist > REACH) return null;
      return {
        x: clamp(((client.x - r.left) / r.width) * W, -60, W + 60),
        y: clamp(((client.y - r.top) / r.height) * H, -50, H + 50),
        near: 1 - dist / REACH,
      };
    };

    const paint = () => {
      const x = pos.x.toFixed(1);
      const y = pos.y.toFixed(1);
      coreRef.current?.setAttribute("cx", x);
      coreRef.current?.setAttribute("cy", y);
      coreRef.current?.setAttribute("r", (120 + 60 * light).toFixed(1));
      haloRef.current?.setAttribute("cx", x);
      haloRef.current?.setAttribute("cy", y);
      if (litRef.current) litRef.current.style.opacity = light.toFixed(3);
      wrap.style.setProperty("--lx", `${((pos.x / W) * 100).toFixed(2)}%`);
      wrap.style.setProperty("--ly", `${((pos.y / H) * 100).toFixed(2)}%`);
      wrap.style.setProperty("--li", light.toFixed(3));
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) / 1000 : 1 / 60;
      last = now;
      const prevX = pos.x;
      const p = read();
      let tx: number;
      let ty: number;
      let tau: number;

      if (p) {
        tx = p.x;
        ty = p.y;
        tau = reduce ? 0.001 : TAU_FOLLOW;
        away = 0;
      } else {
        away += dt;
        if (reduce) {
          tx = pos.x;
          ty = pos.y;
        } else {
          if (away > DRIFT_DELAY) {
            drift.x += drift.dir * DRIFT_SPEED * dt;
            if (drift.x > W - 70) { drift.x = W - 70; drift.dir = -1; }
            if (drift.x < 70) { drift.x = 70; drift.dir = 1; }
          }
          tx = drift.x;
          ty = H / 2 + 16 * Math.sin(now / 2100);
        }
        tau = TAU_DRIFT;
      }

      const a = ease(dt, tau);
      pos.x += (tx - pos.x) * a;
      pos.y += (ty - pos.y) * a;
      light += ((p ? IDLE + (1 - IDLE) * p.near : IDLE) - light) * ease(dt, TAU_LIGHT);

      // Khi đang bám con trỏ, ghi lại chỗ đứng và hướng đi để lúc tự trôi nối tiếp liền mạch.
      if (p) {
        drift = { x: clamp(pos.x, 70, W - 70), dir: drift.dir };
        const vx = (pos.x - prevX) / dt;
        if (Math.abs(vx) > 25) drift.dir = Math.sign(vx);
      }

      paint();
      if (visible) frame = requestAnimationFrame(tick);
    };

    // Chỉ chạy vòng vẽ khi chữ đang nằm trong màn hình.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      last = 0;
      if (visible) frame = requestAnimationFrame(tick);
    });
    observer.observe(wrap);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  const text = (fill: string) => (
    <text
      x={0}
      y={138}
      textLength={W}
      lengthAdjust="spacingAndGlyphs"
      fontSize={168}
      fontWeight={800}
      fill={fill}
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {TEXT}
    </text>
  );

  return (
    <div
      ref={wrapRef}
      className={cn("relative isolate select-none", className)}
      style={{ "--lx": "50%", "--ly": "50%", "--li": IDLE } as React.CSSProperties}
    >
      {/*
        Vệt sáng hắt lên nền sau chữ, đi cùng đèn. Mask hình bầu dục làm mép khối mờ dần về trong suốt, nên không lộ
        cạnh vuông kể cả khi đèn đi sát mép; khối nằm gọn trong bề ngang chữ để không tràn màn hình điện thoại.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -inset-y-16 -z-10"
        style={{
          opacity: "var(--li)",
          background:
            "radial-gradient(18rem 9rem at var(--lx) var(--ly), color-mix(in oklab, var(--primary-bright) 14%, transparent), transparent 75%)",
          maskImage: "radial-gradient(closest-side, #000 45%, transparent)",
          WebkitMaskImage: "radial-gradient(closest-side, #000 45%, transparent)",
        }}
      />

      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label="Khoa Lý luận chính trị và Khoa học xã hội nhân văn">
        <defs>
          {/* Lõi: đậm, nhỏ, nở ra một chút khi đèn sáng hơn. */}
          <radialGradient ref={coreRef} id={`${uid}-core`} gradientUnits="userSpaceOnUse" cx={W / 2} cy={H / 2} r={140}>
            <stop offset="0" style={{ stopColor: "var(--primary)", stopOpacity: 0.95 }} />
            <stop offset="0.45" style={{ stopColor: "var(--primary)", stopOpacity: 0.55 }} />
            <stop offset="1" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
          </radialGradient>
          {/* Quầng: rộng, nhạt, sắc xanh tươi hơn để mép vùng sáng mềm. */}
          <radialGradient ref={haloRef} id={`${uid}-halo`} gradientUnits="userSpaceOnUse" cx={W / 2} cy={H / 2} r={360}>
            <stop offset="0" style={{ stopColor: "var(--primary-bright)", stopOpacity: 0.32 }} />
            <stop offset="0.6" style={{ stopColor: "var(--primary-bright)", stopOpacity: 0.1 }} />
            <stop offset="1" style={{ stopColor: "var(--primary-bright)", stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        {/* Chữ chìm, chỉ khác nền một chút. */}
        {text("color-mix(in oklab, var(--foreground) 6%, transparent)")}
        {/* Phần đèn rọi tới; độ mờ của cả nhóm do vòng vẽ điều khiển. */}
        <g ref={litRef} style={{ opacity: IDLE }}>
          {text(`url(#${uid}-halo)`)}
          {text(`url(#${uid}-core)`)}
        </g>
      </svg>
    </div>
  );
}
