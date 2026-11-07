CREATE TABLE "exam_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exam_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"exam_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"layout" jsonb NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone,
	"auto_submitted" boolean DEFAULT false NOT NULL,
	"score" integer,
	"total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"questions" jsonb NOT NULL,
	"duration_min" integer NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"classes" text[] DEFAULT '{}' NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"shuffle" boolean DEFAULT true NOT NULL,
	"reveal" text DEFAULT 'sau-han' NOT NULL,
	"status" text DEFAULT 'nhap' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_chapter_reviews" (
	"subject" text NOT NULL,
	"chapter" integer NOT NULL,
	"reviewed" boolean NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quiz_questions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject" text NOT NULL,
	"chapter" integer NOT NULL,
	"code" text NOT NULL,
	"q" text NOT NULL,
	"options" jsonb NOT NULL,
	"answer" smallint NOT NULL,
	"explain" text DEFAULT '' NOT NULL,
	"page" integer,
	"hidden" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_chapter_reviews" ADD CONSTRAINT "quiz_chapter_reviews_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_attempts_exam_idx" ON "exam_attempts" USING btree ("exam_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_attempts_open_idx" ON "exam_attempts" USING btree ("exam_id","user_id") WHERE "exam_attempts"."submitted_at" is null;--> statement-breakpoint
CREATE INDEX "exams_status_idx" ON "exams" USING btree ("status","subject");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_chapter_reviews_idx" ON "quiz_chapter_reviews" USING btree ("subject","chapter");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_questions_code_idx" ON "quiz_questions" USING btree ("subject","chapter","code");