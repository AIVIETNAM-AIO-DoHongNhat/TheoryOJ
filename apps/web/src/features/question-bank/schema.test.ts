import { describe, expect, it } from "vitest";

import { mergeBank, type QuizBank } from "@/features/quiz/merge";

import { parseQuestionText, QuestionInput } from "./schema";

describe("parseQuestionText", () => {
  it("đọc câu có dấu sao, dòng Đáp án, giải thích và trang", () => {
    const out = parseQuestionText(`Câu 1: Hàng hóa có mấy thuộc tính?
A. Một
*B. Hai
C. Ba
Giải thích: Giá trị sử dụng và giá trị.
Trang: 32

Câu 2. Tiền tệ có mấy chức năng?
A) Ba
B) Bốn
C) Năm
Đáp án: C`);
    expect(out).toHaveLength(2);
    expect(out[0].error).toBeNull();
    expect(out[0].data).toMatchObject({ q: "Hàng hóa có mấy thuộc tính?", options: ["Một", "Hai", "Ba"], answer: 1, explain: "Giá trị sử dụng và giá trị.", page: 32 });
    expect(out[1].data).toMatchObject({ q: "Tiền tệ có mấy chức năng?", answer: 2, explain: "", page: null });
  });

  it("tách câu không có chữ 'Câu' bằng phương án của câu trước", () => {
    const out = parseQuestionText(`Câu hỏi thứ nhất dài
viết trên hai dòng?
A. x
*B. y
Câu hỏi thứ hai?
*A. m
B. n`);
    expect(out.map((q) => q.data?.q)).toEqual(["Câu hỏi thứ nhất dài viết trên hai dòng?", "Câu hỏi thứ hai?"]);
    expect(out[1].data?.answer).toBe(0);
  });

  it("báo lỗi câu thiếu đáp án, nhiều đáp án, đáp án không có", () => {
    const out = parseQuestionText(`Câu 1: Thiếu đáp án?
A. a
B. b

Câu 2: Hai đáp án?
*A. a
*B. b

Câu 3: Đáp án lạ?
A. a
B. b
Đáp án: D`);
    expect(out.map((q) => q.data)).toEqual([null, null, null]);
    expect(out[0].error).toMatch(/Chưa đánh dấu/);
    expect(out[1].error).toMatch(/nhiều phương án/);
    expect(out[2].error).toMatch(/D không có/);
    expect(out[2].line).toBe(9);
  });

  it("giải thích viết trên nhiều dòng", () => {
    const [q] = parseQuestionText(`Câu 1: Hỏi gì?
*A. a
B. b
Giải thích: dòng một
dòng hai`);
    expect(q.data?.explain).toBe("dòng một dòng hai");
  });
});

describe("QuestionInput", () => {
  it("không nhận phương án trùng hoặc đáp án ngoài phạm vi", () => {
    expect(QuestionInput.safeParse({ q: "Câu hỏi?", options: ["A", "a"], answer: 0 }).success).toBe(false);
    expect(QuestionInput.safeParse({ q: "Câu hỏi?", options: ["A", "B"], answer: 2 }).success).toBe(false);
    expect(QuestionInput.safeParse({ q: "Câu hỏi?", options: [" A ", "B"], answer: 1 }).data?.options).toEqual(["A", "B"]);
  });
});

describe("mergeBank", () => {
  const content: QuizBank = {
    subject: "ktct",
    chapter: 1,
    reviewed: false,
    questions: [
      { id: "c1-01", q: "Gốc 1", options: ["a", "b"], answer: 0, explain: "" },
      { id: "c1-02", q: "Gốc 2", options: ["a", "b"], answer: 1, explain: "" },
      { id: "c1-03", q: "Gốc 3", options: ["a", "b"], answer: 1, explain: "" },
    ],
  };
  const edit = { chapter: 1, options: ["x", "y"], answer: 1, explain: "", page: null, hidden: false, examOnly: false };

  it("sửa, ẩn câu trong file và thêm câu mới sau cùng", () => {
    const bank = mergeBank("ktct", 1, content, {
      questions: [
        { ...edit, code: "gv1-new", q: "Mới" },
        { ...edit, code: "c1-02", q: "Đã sửa" },
        { ...edit, code: "c1-03", q: "Gốc 3", hidden: true },
        { ...edit, chapter: 2, code: "gv2-x", q: "Chương khác" },
      ],
      reviews: { 1: true },
    });
    expect(bank?.questions.map((q) => q.q)).toEqual(["Gốc 1", "Đã sửa", "Mới"]);
    expect(bank?.reviewed).toBe(true);
  });

  it("chương chưa có file vẫn có ngân hàng nếu giảng viên đã soạn câu", () => {
    expect(mergeBank("ktct", 7, null, { questions: [], reviews: {} })).toBeNull();
  });

  it("câu chỉ dùng cho đề thi không hiện ở ôn tập, vẫn chọn được cho đề thi", () => {
    const edits = {
      questions: [
        { ...edit, code: "c1-01", q: "Gốc 1", examOnly: true },
        { ...edit, code: "gv1-de", q: "Câu đề thi", examOnly: true },
        { ...edit, code: "gv1-an", q: "Câu ẩn", examOnly: true, hidden: true },
      ],
      reviews: {},
    };
    expect(mergeBank("ktct", 1, content, edits)?.questions.map((q) => q.id)).toEqual(["c1-02", "c1-03"]);
    const exam = mergeBank("ktct", 1, content, edits, "exam")?.questions;
    expect(exam?.map((q) => [q.id, !!q.examOnly])).toEqual([["c1-01", true], ["c1-02", false], ["c1-03", false], ["gv1-de", true]]);
    expect(mergeBank("ktct", 7, null, { questions: [{ ...edit, chapter: 7, code: "gv7-a", q: "Mới" }], reviews: {} })?.questions).toHaveLength(1);
  });
});
