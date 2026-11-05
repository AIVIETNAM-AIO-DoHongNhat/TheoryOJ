CREATE TABLE "reader_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reader_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"visitor_id" text NOT NULL,
	"subject" text NOT NULL,
	"source" text NOT NULL,
	"slug" text NOT NULL,
	"chapter" integer,
	"pdf_page" integer,
	"quote" text NOT NULL,
	"prefix" text DEFAULT '' NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_flashcards" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_flashcards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"visitor_id" text NOT NULL,
	"subject" text NOT NULL,
	"chapter" integer NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"pdf_page" integer,
	"source_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "reader_notes_doc_idx" ON "reader_notes" USING btree ("visitor_id","source","slug");--> statement-breakpoint
CREATE INDEX "reader_notes_chapter_idx" ON "reader_notes" USING btree ("visitor_id","subject","chapter");--> statement-breakpoint
CREATE INDEX "user_flashcards_visitor_idx" ON "user_flashcards" USING btree ("visitor_id","subject","chapter");