import { describe, expect, it } from "vitest";

import { toEmbed } from "./embed";

const href = (raw: string) => toEmbed(raw)?.href ?? null;

describe("toEmbed", () => {
  it("nhận các dạng link video và chuẩn hóa về www.facebook.com", () => {
    expect(href("https://www.facebook.com/watch/?v=123456")).toBe("https://www.facebook.com/watch/?v=123456");
    expect(href("https://m.facebook.com/watch?v=123456&mibextid=abc")).toBe("https://www.facebook.com/watch/?v=123456");
    expect(href("https://web.facebook.com/hvann.cand/videos/987654321/?rdid=x")).toBe("https://www.facebook.com/hvann.cand/videos/987654321/");
    expect(href("https://www.facebook.com/hvann.cand/videos/ten-video/987654321")).toBe("https://www.facebook.com/hvann.cand/videos/ten-video/987654321/");
    expect(href("https://www.facebook.com/reel/555")).toBe("https://www.facebook.com/reel/555/");
    expect(href("https://www.facebook.com/share/v/1AbC-d_9/")).toBe("https://www.facebook.com/share/v/1AbC-d_9/");
    expect(href("https://fb.watch/aBc123/")).toBe("https://fb.watch/aBc123/");
  });

  it("nhận nguyên mã <iframe> chép từ nút Nhúng", () => {
    const code =
      '<iframe src="https://www.facebook.com/plugins/video.php?height=314&amp;href=https%3A%2F%2Fwww.facebook.com%2Fhvann.cand%2Fvideos%2F42%2F&amp;show_text=false&amp;width=560" width="560"></iframe>';
    expect(href(code)).toBe("https://www.facebook.com/hvann.cand/videos/42/");
  });

  it("từ chối link không phải video Facebook", () => {
    for (const bad of [
      "https://www.facebook.com/hvann.cand",
      "https://www.facebook.com/photo/?fbid=1",
      "https://evil.com/watch/?v=1",
      "https://facebook.com.evil.com/watch/?v=1",
      "javascript:alert(1)",
      "khong-phai-link",
      "",
    ]) {
      expect(toEmbed(bad), bad).toBeNull();
    }
  });

  it("YouTube: các dạng link, bỏ tham số theo dõi, giữ giây bắt đầu", () => {
    const e = toEmbed("https://www.youtube.com/watch?v=Oq8IMkrt3oE&t=12s&pp=ygU2cGjDoXQ")!;
    expect(e.provider).toBe("youtube");
    expect(e.href).toBe("https://www.youtube.com/watch?v=Oq8IMkrt3oE&t=12s");
    expect(e.src).toBe("https://www.youtube-nocookie.com/embed/Oq8IMkrt3oE?rel=0&start=12");
    expect(e.thumbnail).toBe("https://i.ytimg.com/vi/Oq8IMkrt3oE/hqdefault.jpg");

    expect(href("https://www.youtube.com/watch?v=IONfqbbvzys&pp=ygUsUGhpbSB0w6BpIGxp4buHdSB0aMOgbmggdOG7sXUgxJHhuqV0IG7GsOG7m2M%3D")).toBe(
      "https://www.youtube.com/watch?v=IONfqbbvzys",
    );
    expect(href("https://youtu.be/sY3aVOBllwg?t=1m30s")).toBe("https://www.youtube.com/watch?v=sY3aVOBllwg&t=90s");
    expect(href("https://m.youtube.com/shorts/gevIKIzONMA")).toBe("https://www.youtube.com/watch?v=gevIKIzONMA");
    expect(href('<iframe src="https://www.youtube.com/embed/fJoIzvmLTnQ?si=x" allowfullscreen></iframe>')).toBe(
      "https://www.youtube.com/watch?v=fJoIzvmLTnQ",
    );
    expect(toEmbed("https://www.youtube.com/watch?v=qua-ngan")).toBeNull();
    expect(toEmbed("https://www.youtube.com/@vtv24")).toBeNull();
  });

  it("địa chỉ nhúng là plugin video của Facebook, mã hóa link gốc", () => {
    const e = toEmbed("https://www.facebook.com/reel/555")!;
    const src = new URL(e.src);
    expect(src.origin + src.pathname).toBe("https://www.facebook.com/plugins/video.php");
    expect(src.searchParams.get("href")).toBe(e.href);
    expect(src.searchParams.get("width")).toBe("1280");
    expect(new URL(toEmbed("https://www.facebook.com/reel/555", { vertical: true })!.src).searchParams.has("width")).toBe(false);
  });
});
