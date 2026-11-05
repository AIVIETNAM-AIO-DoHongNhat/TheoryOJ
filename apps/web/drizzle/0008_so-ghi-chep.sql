CREATE TABLE "notebook_pages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notebook_pages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notebook_id" integer NOT NULL,
	"visitor_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"subject" text,
	"chapter" integer,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notebooks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notebooks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"visitor_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'xanh-la' NOT NULL,
	"icon" text DEFAULT 'so' NOT NULL,
	"paper" text DEFAULT 'ke-ngang' NOT NULL,
	"font_size" text DEFAULT 'vua' NOT NULL,
	"page_order" text DEFAULT 'moi-sua' NOT NULL,
	"subject" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notebook_pages" ADD CONSTRAINT "notebook_pages_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notebook_pages_notebook_idx" ON "notebook_pages" USING btree ("notebook_id","updated_at");--> statement-breakpoint
CREATE INDEX "notebook_pages_chapter_idx" ON "notebook_pages" USING btree ("visitor_id","subject","chapter");--> statement-breakpoint
CREATE INDEX "notebooks_visitor_idx" ON "notebooks" USING btree ("visitor_id","updated_at");