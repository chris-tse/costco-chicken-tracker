CREATE TABLE "chicken_sightings" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"store_id" integer NOT NULL,
	"label_time" timestamp with time zone NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_lat" numeric,
	"user_lng" numeric,
	"flagged" boolean DEFAULT false,
	"flag_reason" text,
	"admin_reviewed" boolean DEFAULT false,
	"admin_approved" boolean,
	"algorithm_suggestion" boolean,
	"doneness" smallint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"created_by" text,
	"used_by" text,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY,
	"external_id" text UNIQUE,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"lat" numeric NOT NULL,
	"lng" numeric NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"name" text,
	"image" text,
	"default_store_id" integer,
	"commute_minutes" integer DEFAULT 15,
	"trust_score" numeric DEFAULT '1.0',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chicken_sightings" ADD CONSTRAINT "chicken_sightings_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "chicken_sightings" ADD CONSTRAINT "chicken_sightings_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_used_by_users_id_fkey" FOREIGN KEY ("used_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_default_store_id_stores_id_fkey" FOREIGN KEY ("default_store_id") REFERENCES "stores"("id");