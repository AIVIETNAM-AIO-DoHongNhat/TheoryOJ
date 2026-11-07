CREATE TABLE "open_answer_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "open_answer_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"visitor_id" text NOT NULL,
	"user_id" text,
	"subject" text NOT NULL,
	"chapter" integer NOT NULL,
	"kind" text NOT NULL,
	"item_id" text NOT NULL,
	"parent_id" integer,
	"answer" text NOT NULL,
	"rubric" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" real NOT NULL,
	"max_score" real NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"model" text,
	"latency_ms" integer,
	"lecturer_score" real,
	"lecturer_note" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "open_answer_attempts" ADD CONSTRAINT "open_answer_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_answer_attempts" ADD CONSTRAINT "open_answer_attempts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "open_answer_visitor_idx" ON "open_answer_attempts" USING btree ("visitor_id","subject","chapter");--> statement-breakpoint
CREATE INDEX "open_answer_review_idx" ON "open_answer_attempts" USING btree ("kind","created_at");