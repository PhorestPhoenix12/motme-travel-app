CREATE TABLE "place_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" text NOT NULL,
	"google_place_name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"city_key" text NOT NULL,
	"country_key" text NOT NULL,
	"category" text NOT NULL,
	"place_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"primary_type" text DEFAULT '' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"rating" double precision,
	"ratings_count" integer DEFAULT 0 NOT NULL,
	"google_summary" text DEFAULT '' NOT NULL,
	"gemini_description" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"hint_1" text NOT NULL,
	"hint_2" text NOT NULL,
	"hint_3" text NOT NULL,
	"identity_facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_cards_google_place_id_unique" UNIQUE("google_place_id")
);

CREATE INDEX "place_cards_city_category_idx" ON "place_cards" USING btree ("city_key","country_key","category");

ALTER TABLE "quest_records" ADD COLUMN "place_card_id" uuid;
ALTER TABLE "quest_records" ADD COLUMN "place_name" text;
ALTER TABLE "quest_records" ADD COLUMN "place_address" text;
ALTER TABLE "quest_records" ADD COLUMN "place_types" jsonb;
ALTER TABLE "quest_records" ADD CONSTRAINT "quest_records_place_card_id_place_cards_id_fk" FOREIGN KEY ("place_card_id") REFERENCES "public"."place_cards"("id") ON DELETE set null ON UPDATE no action;
