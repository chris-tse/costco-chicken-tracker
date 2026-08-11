CREATE TABLE "sightings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sightings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"label_date" date NOT NULL,
	"label_minute" smallint NOT NULL,
	"doneness" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sightings_label_minute_check" CHECK ("label_minute" between 0 and 1439),
	CONSTRAINT "sightings_doneness_check" CHECK ("doneness" in ('light', 'medium', 'dark'))
);
--> statement-breakpoint
CREATE INDEX "sightings_recent_idx" ON "sightings" ("created_at" desc,"id" desc);