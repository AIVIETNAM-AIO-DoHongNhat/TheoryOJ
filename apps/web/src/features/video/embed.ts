/**
 * Chuyển link video người dùng dán vào thành địa chỉ nhúng (iframe).
 * Hỗ trợ Facebook và YouTube. Thêm nguồn khác (file tự lưu trữ, nền tảng bài giảng) thì thêm một hàm chuẩn hóa
 * vào `PROVIDERS` và mở rộng `VideoProvider`; trang không cần sửa, chỉ cần mở CSP frame-src ở next.config.ts.
 */

export type VideoProvider = "facebook" | "youtube";

export interface VideoEmbed {
  provider: VideoProvider;
  /** Link gốc đã chuẩn hóa, dùng cho nút "Mở trên …". */
  href: string;
  /** Địa chỉ đặt vào iframe. */
  src: string;
  /** Ảnh thu nhỏ do nền tảng cấp, dùng làm bìa khi video không khai `cover`. Facebook không có. */
  thumbnail: string | null;
}

export const PROVIDER_LABELS: Record<VideoProvider, string> = { facebook: "Facebook", youtube: "YouTube" };

interface EmbedOptions {
  vertical?: boolean;
}

function parseUrl(raw: string): URL | null {
  // Nhận cả mã <iframe src="…"> chép từ nút "Nhúng" của nền tảng.
  const iframeSrc = /src="([^"]+)"/.exec(raw)?.[1]?.replace(/&amp;/g, "&");
  try {
    const url = new URL((iframeSrc ?? raw).trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

const FACEBOOK_HOST = /^(?:www\.|m\.|web\.|mbasic\.)?facebook\.com$/;

/**
 * Các dạng link video Facebook: /watch?v=…, /<trang>/videos/<id>, /reel/<id>, /share/v/<mã>, /share/r/<mã>, fb.watch/<mã>,
 * và mã nhúng .../plugins/video.php?href=….
 */
function facebookHref(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "fb.watch") {
    return /^\/[\w-]+\/?$/.test(url.pathname) ? `https://fb.watch${url.pathname}` : null;
  }
  if (!FACEBOOK_HOST.test(host)) return null;

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/plugins/video.php") {
    const inner = parseUrl(url.searchParams.get("href") ?? "");
    return inner ? facebookHref(inner) : null;
  }
  const v = url.searchParams.get("v");
  if ((path === "/watch" || path === "/video.php") && v && /^\d+$/.test(v)) {
    return `https://www.facebook.com/watch/?v=${v}`;
  }
  // Bỏ tham số theo dõi (mibextid, rdid, ...), chỉ giữ đường dẫn.
  if (/^\/[\w.-]+\/videos\/(?:[\w.-]+\/)?\d+$/.test(path) || /^\/reel\/\d+$/.test(path) || /^\/share\/[vr]\/[\w-]+$/.test(path)) {
    return `https://www.facebook.com${path}/`;
  }
  return null;
}

function facebook(url: URL, opts: EmbedOptions): VideoEmbed | null {
  const href = facebookHref(url);
  if (!href) return null;
  const params = new URLSearchParams({ href, show_text: "false" });
  // Video ngang để rộng tối đa cho khung co giãn; video dọc (reel) để Facebook tự chọn khổ.
  if (!opts.vertical) params.set("width", "1280");
  return { provider: "facebook", href, src: `https://www.facebook.com/plugins/video.php?${params}`, thumbnail: null };
}

const YOUTUBE_HOST = /^(?:www\.|m\.|music\.)?youtube(?:-nocookie)?\.com$/;
const YOUTUBE_ID = /^[\w-]{11}$/;

/** "12", "12s", "1m30s", "1h2m3s" → số giây. */
function parseStart(t: string | null): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

/** Các dạng link YouTube: /watch?v=…, youtu.be/…, /shorts/…, /live/…, /embed/…. Tham số t= (giây bắt đầu) được giữ. */
function youtube(url: URL): VideoEmbed | null {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = path.slice(1);
  else if (YOUTUBE_HOST.test(host)) {
    if (path === "/watch") id = url.searchParams.get("v");
    else id = /^\/(?:shorts|live|embed)\/([^/]+)$/.exec(path)?.[1] ?? null;
  }
  if (!id || !YOUTUBE_ID.test(id)) return null;

  const start = parseStart(url.searchParams.get("t") ?? url.searchParams.get("start"));
  const params = new URLSearchParams({ rel: "0" });
  if (start) params.set("start", String(start));
  return {
    provider: "youtube",
    href: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ""}`,
    // Bản youtube-nocookie không đặt cookie theo dõi khi người xem chưa bấm phát.
    src: `https://www.youtube-nocookie.com/embed/${id}?${params}`,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

const PROVIDERS: ((url: URL, opts: EmbedOptions) => VideoEmbed | null)[] = [facebook, youtube];

/** Trả về null khi link không thuộc nguồn nào đã hỗ trợ. */
export function toEmbed(raw: string, opts: EmbedOptions = {}): VideoEmbed | null {
  const url = parseUrl(raw);
  if (!url) return null;
  for (const provider of PROVIDERS) {
    const embed = provider(url, opts);
    if (embed) return embed;
  }
  return null;
}
