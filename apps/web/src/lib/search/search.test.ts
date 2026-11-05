import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { lexicalQuery, normalizeQuery, rrf } from "./query";

// Các ca dưới đây lấy từ services/rag/tests/test_retrieval.py để hai bản cho cùng kết quả.
describe("lexicalQuery", () => {
  it("ghép từng cặp âm tiết liền nhau", () => {
    expect(lexicalQuery("Tỷ suất giá trị thặng dư")).toBe("tỷ <-> suất | suất <-> giá | giá <-> trị | trị <-> thặng | thặng <-> dư");
    expect(lexicalQuery("m'")).toBe("m");
    expect(lexicalQuery("?!")).toBeNull();
  });

  it("không để toán tử tsquery lọt vào", () => {
    const q = lexicalQuery("a & b | !(c) 'd'")!;
    expect(new Set(q.replaceAll("<->", " ").replaceAll("|", " ").split(/\s+/).filter(Boolean))).toEqual(new Set(["a", "b", "c", "d"]));
  });

  it("bỏ cặp trùng và giữ thứ tự xuất hiện", () => {
    expect(lexicalQuery("a b a b")).toBe("a <-> b | b <-> a");
  });
});

describe("normalizeQuery", () => {
  it("chuẩn hóa NFC và gộp khoảng trắng", () => {
    expect(normalizeQuery("  giá \n trị  ")).toBe("giá trị");
    // "ư" + dấu hỏi dạng tổ hợp (NFD) phải về dạng dựng sẵn.
    expect(normalizeQuery("dử")).toBe("dử");
  });
});

describe("rrf", () => {
  it("ưu tiên đoạn xuất hiện ở cả hai danh sách và giữ trường của cả hai", () => {
    const dense = [
      { id: "1", vector_score: 0.9 },
      { id: "2", vector_score: 0.8 },
      { id: "3", vector_score: 0.7 },
    ];
    const sparse = [
      { id: "3", lexical_score: 0.5 },
      { id: "4", lexical_score: 0.4 },
    ];
    const merged = rrf<{ id: string; vector_score?: number; lexical_score?: number }>([dense, sparse]);
    expect(merged.map((m) => m.id).slice(0, 2)).toEqual(["3", "1"]);
    expect(merged[0]).toMatchObject({ vector_score: 0.7, lexical_score: 0.5 });
  });
});

describe("OpenRouter client", () => {
  const fetchMock = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    vi.stubEnv("OPENROUTER_BASE_URL", "https://openrouter.test/api/v1");
    vi.stubEnv("EMBED_MODEL", "baai/bge-m3");
    vi.stubEnv("RERANK_MODEL", "cohere/rerank-v3.5");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    // Bỏ thời gian chờ giữa các lần thử.
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void) => (fn(), 0)) as unknown as typeof setTimeout);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it("embedding: gửi đúng yêu cầu và chuẩn hóa vector về độ dài 1", async () => {
    fetchMock.mockResolvedValueOnce(ok({ data: [{ index: 0, embedding: [3, 4] }] }));
    const { embedQuery } = await import("./openrouter");
    const vec = await embedQuery("giá trị thặng dư");
    expect(vec).toEqual([0.6, 0.8]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.test/api/v1/embeddings");
    expect(init.headers.authorization).toBe("Bearer sk-or-test");
    expect(JSON.parse(init.body)).toEqual({ model: "baai/bge-m3", input: ["giá trị thặng dư"], encoding_format: "float" });
  });

  it("rerank: trả điểm đúng thứ tự tài liệu dù kết quả bị đảo", async () => {
    fetchMock.mockResolvedValueOnce(
      ok({ results: [{ index: 2, relevance_score: 0.9 }, { index: 0, relevance_score: 0.1 }, { index: 1, relevance_score: 0.5 }] }),
    );
    const { rerank } = await import("./openrouter");
    expect(await rerank("q", ["a", "b", "c"])).toEqual([0.1, 0.5, 0.9]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ model: "cohere/rerank-v3.5", query: "q", documents: ["a", "b", "c"] });
  });

  it("rerank: thiếu điểm của một tài liệu là lỗi", async () => {
    fetchMock.mockResolvedValueOnce(ok({ results: [{ index: 0, relevance_score: 0.1 }] }));
    const { rerank } = await import("./openrouter");
    await expect(rerank("q", ["a", "b"])).rejects.toThrow(/mọi tài liệu/);
  });

  it("thử lại khi 429 rồi 502, thành công ở lần ba", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }))
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(ok({ results: [{ index: 0, relevance_score: 0.7 }] }));
    const { rerank } = await import("./openrouter");
    expect(await rerank("q", ["a"])).toEqual([0.7]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("không thử lại lỗi 4xx như sai khóa", async () => {
    fetchMock.mockResolvedValueOnce(new Response("bad key", { status: 401 }));
    const { rerank } = await import("./openrouter");
    await expect(rerank("q", ["a"])).rejects.toThrow(/401/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("trường error trong phản hồi 200 được thử lại rồi báo lỗi", async () => {
    fetchMock.mockImplementation(async () => ok({ error: { message: "provider down" } }));
    const { rerank } = await import("./openrouter");
    await expect(rerank("q", ["a"])).rejects.toThrow(/provider down/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
