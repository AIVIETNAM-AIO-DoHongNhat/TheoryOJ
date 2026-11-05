import {
  boolean, index, integer, jsonb, pgTable, real, smallint, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

// Bảng của ứng dụng (PLAN.md mục 7). Bảng documents, chunks do services/rag sở hữu.
// Mọi dữ liệu học tập gắn với mã khách (`visitor_id`, lib/visitor.ts). Người chưa đăng nhập dùng mã ngẫu nhiên trong cookie;
// tài khoản có mã khách riêng (`users.visitor_id`), khi đăng nhập dữ liệu của trình duyệt được gộp vào mã đó.

/** Tài khoản tự đăng ký (lib/auth). Giảng viên do người phát triển cấp quyền bằng scripts/cap-quyen.mts. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  /** Mã học viên, viết hoa, dùng để đăng nhập. */
  studentCode: text("student_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  className: text("class_name").notNull(),
  /** scrypt, định dạng ở lib/auth/password.ts. */
  passwordHash: text("password_hash").notNull(),
  /** Mã khách của tài khoản: tiến độ, hội thoại, khảo sát lưu theo mã này. */
  visitorId: text("visitor_id").notNull().unique(),
  /** `giang-vien` vào được trang quản trị /quan-tri. */
  role: text("role", { enum: ["hoc-vien", "giang-vien"] }).notNull().default("hoc-vien"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

/** Phiên đăng nhập. Chỉ lưu SHA-256 của mã phiên, mã gốc nằm trong cookie httpOnly. */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const conversations = pgTable("conversations", {
  /** Id do client sinh (useChat), gửi lên trong trường `id` của mỗi yêu cầu. */
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("conversations_visitor_updated_idx").on(t.visitorId, t.updatedAt)]);

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  /** Phần chữ, dùng khi xem lại nhật ký. */
  content: text("content").notNull(),
  /** Toàn bộ UIMessage.parts để mở lại hội thoại cùng trích dẫn và kết quả công cụ. */
  parts: jsonb("parts").notNull(),
  // Các trường dưới chỉ có ở tin nhắn của trợ lý.
  /** Câu hỏi của lượt này, để câu hỏi và câu trả lời nằm trên một dòng khi xem lại. */
  question: text("question"),
  mode: text("mode"),
  chapters: integer("chapters").array(),
  label: text("label"),
  /** Lý do từ chối (`RefusalReason`), null nếu đã trả lời. */
  refused: text("refused"),
  /** Câu khiêu khích hoặc chèn lệnh, cần giảng viên xem. */
  flagged: boolean("flagged").notNull().default(false),
  rewrittenQuery: text("rewritten_query"),
  maxScore: real("max_score"),
  citations: jsonb("citations"),
  latencyMs: integer("latency_ms"),
  timings: jsonb("timings"),
  /** Bị lỗi hoặc người hỏi bấm dừng giữa chừng. */
  incomplete: boolean("incomplete").notNull().default(false),
  /** Giảng viên đã xem ở trang quản trị (tin nhắn gắn cờ, bị từ chối, bị 👎). */
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("messages_conversation_idx").on(t.conversationId, t.createdAt),
  index("messages_log_idx").on(t.role, t.createdAt),
]);

export const feedback = pgTable("feedback", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(),
  /** 1 là 👍, -1 là 👎. */
  rating: smallint("rating").notNull(),
  reason: text("reason"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("feedback_message_visitor_idx").on(t.messageId, t.visitorId)]);

/** Một lượt làm trắc nghiệm hoặc bài tập tính toán, gắn với mã khách. Bảng tiến độ đọc từ đây. */
export const practiceAttempts = pgTable("practice_attempts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  visitorId: text("visitor_id").notNull(),
  subject: text("subject").notNull(),
  chapter: integer("chapter").notNull(),
  kind: text("kind", { enum: ["quiz", "exercise"] }).notNull(),
  /** Số câu (trắc nghiệm) hoặc số đại lượng (bài tập) làm đúng. */
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  /** Trắc nghiệm: [{ id, chosen, correct }]. Bài tập: { template, given, answers, expected }. */
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("practice_attempts_visitor_idx").on(t.visitorId, t.subject, t.createdAt)]);

/** Lịch ôn thẻ ghi nhớ: mỗi mã khách một dòng cho mỗi thẻ đã ôn. Thẻ nằm trong content/<môn>/the-ghi-nho/. */
export const flashcardStates = pgTable("flashcard_states", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  visitorId: text("visitor_id").notNull(),
  subject: text("subject").notNull(),
  chapter: integer("chapter").notNull(),
  cardId: text("card_id").notNull(),
  ease: real("ease").notNull(),
  /** Khoảng ôn hiện tại (ngày); 0 là đang học lại sau khi quên. */
  intervalDays: real("interval_days").notNull(),
  reps: integer("reps").notNull(),
  lapses: integer("lapses").notNull(),
  reviews: integer("reviews").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("flashcard_states_card_idx").on(t.visitorId, t.subject, t.cardId)]);

/** Trang PDF đọc gần nhất của mỗi tài liệu, để mở lại đúng chỗ và hiện "Đọc tiếp" ở trang Hôm nay. Chỉ học viên. */
export const readingPositions = pgTable("reading_positions", {
  visitorId: text("visitor_id").notNull(),
  slug: text("slug").notNull(),
  page: integer("page").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("reading_positions_doc_idx").on(t.visitorId, t.slug),
  index("reading_positions_recent_idx").on(t.visitorId, t.updatedAt),
]);

/** Đếm theo cửa sổ cố định cho /api/chat, theo mã khách và theo IP. */
export const chatRateLimits = pgTable("chat_rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

/** Khảo sát thang 5 điểm trước và sau đợt thử nghiệm (PLAN.md mục 10). Mỗi trình duyệt một phiếu cho mỗi đợt, gửi lại thì ghi đè. */
export const surveyResponses = pgTable("survey_responses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  visitorId: text("visitor_id").notNull(),
  /** "truoc" hoặc "sau" đợt thử nghiệm. */
  phase: text("phase", { enum: ["truoc", "sau"] }).notNull(),
  role: text("role", { enum: ["hoc-vien", "giang-vien"] }).notNull(),
  /** { mã câu: điểm 1–5 }, mã câu ở features/survey/questions.ts. */
  answers: jsonb("answers").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("survey_visitor_phase_idx").on(t.visitorId, t.phase)]);

/**
 * Ghi chú của học viên trên một đoạn bôi đen trong thư viện (PDF, văn kiện) hoặc bài viết. Chỉ học viên.
 * PDF định vị bằng trang; văn bản định vị bằng chính đoạn trích cùng vài ký tự trước, sau (features/notes/anchor.ts).
 */
export const readerNotes = pgTable("reader_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  visitorId: text("visitor_id").notNull(),
  subject: text("subject").notNull(),
  /** `thu-vien` hoặc `bai-viet`, cùng với slug cho biết đường dẫn mở lại. */
  source: text("source", { enum: ["thu-vien", "bai-viet"] }).notNull(),
  slug: text("slug").notNull(),
  chapter: integer("chapter"),
  /** Trang PDF (không phải trang in); null với văn bản. */
  pdfPage: integer("pdf_page"),
  quote: text("quote").notNull(),
  prefix: text("prefix").notNull().default(""),
  suffix: text("suffix").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("reader_notes_doc_idx").on(t.visitorId, t.source, t.slug),
  index("reader_notes_chapter_idx").on(t.visitorId, t.subject, t.chapter),
]);

/** Thẻ ghi nhớ học viên tự tạo. Mã thẻ trong flashcard_states là `u-<id>` để không trùng thẻ trong content/. */
export const userFlashcards = pgTable("user_flashcards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  visitorId: text("visitor_id").notNull(),
  subject: text("subject").notNull(),
  chapter: integer("chapter").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  /** Trang PDF của giáo trình nơi tạo thẻ, để mở lại. */
  pdfPage: integer("pdf_page"),
  sourceSlug: text("source_slug"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("user_flashcards_visitor_idx").on(t.visitorId, t.subject, t.chapter)]);

/**
 * Sổ ghi chép của học viên (features/notebooks). Mỗi học viên có nhiều sổ, mỗi sổ tự chọn bìa, kiểu giấy, môn.
 * Màu, biểu tượng, kiểu giấy là mã trong features/notebooks/types.ts, được kiểm tra ở Server Action.
 */
export const notebooks = pgTable("notebooks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  visitorId: text("visitor_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("xanh-la"),
  icon: text("icon").notNull().default("so"),
  paper: text("paper").notNull().default("ke-ngang"),
  fontSize: text("font_size").notNull().default("vua"),
  pageOrder: text("page_order").notNull().default("moi-sua"),
  /** Môn gắn với sổ; null là sổ chung. */
  subject: text("subject"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** Đổi khi sửa sổ hoặc bất kỳ trang nào trong sổ, để xếp sổ mới dùng lên đầu. */
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("notebooks_visitor_idx").on(t.visitorId, t.updatedAt)]);

/** Một trang trong sổ: tiêu đề và nội dung Markdown (có công thức KaTeX). `visitor_id` lặp lại để kiểm tra quyền không cần nối bảng. */
export const notebookPages = pgTable("notebook_pages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  notebookId: integer("notebook_id").notNull().references(() => notebooks.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  /** Chương của trang, để hiện ở trang chương và lọc. Môn lấy theo sổ, hoặc theo tài liệu khi chép từ trình đọc. */
  subject: text("subject"),
  chapter: integer("chapter"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("notebook_pages_notebook_idx").on(t.notebookId, t.updatedAt),
  index("notebook_pages_chapter_idx").on(t.visitorId, t.subject, t.chapter),
]);

/**
 * Huy hiệu học viên đã sưu tầm (features/badges). Điều kiện tính lại từ dữ liệu học tập; bảng này giữ ngày mở khóa
 * và để huy hiệu không mất đi khi dữ liệu nguồn đổi (chuỗi đứt, thẻ đã thuộc lại đến hạn).
 */
export const userBadges = pgTable("user_badges", {
  visitorId: text("visitor_id").notNull(),
  /** Mã trong features/badges/catalog.ts, ví dụ `chuoi-7`, `chuong:ktct:3`. */
  badgeId: text("badge_id").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("user_badges_badge_idx").on(t.visitorId, t.badgeId)]);
