CREATE TABLE "quiz_draws" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"subject" text NOT NULL,
	"chapter" integer NOT NULL,
	"question_ids" text[] NOT NULL,
	"wrong_ids" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "exam_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "quiz_draws_visitor_idx" ON "quiz_draws" USING btree ("visitor_id","created_at");