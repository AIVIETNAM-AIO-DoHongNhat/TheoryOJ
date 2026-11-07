DROP INDEX "open_answer_review_idx";--> statement-breakpoint
ALTER TABLE "open_answer_attempts" ADD COLUMN "graded_by" text;--> statement-breakpoint
ALTER TABLE "open_answer_attempts" ADD COLUMN "graded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "open_answer_attempts" ADD COLUMN "submitted_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subjects" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "open_answer_attempts" ADD CONSTRAINT "open_answer_attempts_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "open_answer_queue_idx" ON "open_answer_attempts" USING btree ("subject","graded_at","submitted_at");--> statement-breakpoint
-- Bài cũ: thời điểm nộp là thời điểm tạo.
UPDATE "open_answer_attempts" SET "submitted_at" = "created_at";--> statement-breakpoint
-- Giảng viên hiện có phụ trách môn đang mở (KTCT); đổi bằng npm run cap-quyen -- <mã> --mon <môn,...>.
UPDATE "users" SET "subjects" = ARRAY['ktct'] WHERE "role" = 'giang-vien';
