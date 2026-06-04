CREATE TABLE "daily_commentaries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"as_of_date" date NOT NULL,
	"scope" text NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"body_md" text NOT NULL,
	"model" text NOT NULL,
	"inputs_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicator_snapshots" (
	"indicator_id" uuid PRIMARY KEY NOT NULL,
	"latest_value" numeric(20, 10),
	"latest_date" date,
	"change_1d" numeric(20, 10),
	"change_5d" numeric(20, 10),
	"change_20d" numeric(20, 10),
	"pct_rank_1y" numeric(10, 6),
	"zscore_1y" numeric(10, 6),
	"state_label" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicator_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"indicator_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"fetch_mode" text NOT NULL,
	"source_url" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"license_note" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicators" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"frequency" text NOT NULL,
	"status" text NOT NULL,
	"source_policy" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indicators_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"indicator_id" uuid NOT NULL,
	"observation_date" date NOT NULL,
	"value" numeric(20, 10) NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"source_provider" text NOT NULL,
	"source_external_id" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"job_name" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"records_upserted" integer,
	"error_message" text,
	"meta" jsonb
);
--> statement-breakpoint
ALTER TABLE "indicator_snapshots" ADD CONSTRAINT "indicator_snapshots_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_sources" ADD CONSTRAINT "indicator_sources_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_commentaries_asof_scope_uq" ON "daily_commentaries" USING btree ("as_of_date","scope");--> statement-breakpoint
CREATE INDEX "daily_commentaries_scope_idx" ON "daily_commentaries" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "indicator_snapshots_updated_idx" ON "indicator_snapshots" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "indicator_sources_indicator_idx" ON "indicator_sources" USING btree ("indicator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "indicator_sources_mapping_uq" ON "indicator_sources" USING btree ("indicator_id","provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "indicators_slug_uq" ON "indicators" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "indicators_frequency_idx" ON "indicators" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "indicators_status_idx" ON "indicators" USING btree ("status");--> statement-breakpoint
CREATE INDEX "indicators_category_idx" ON "indicators" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "observations_indicator_date_uq" ON "observations" USING btree ("indicator_id","observation_date");--> statement-breakpoint
CREATE INDEX "observations_indicator_date_idx" ON "observations" USING btree ("indicator_id","observation_date");--> statement-breakpoint
CREATE INDEX "observations_source_external_idx" ON "observations" USING btree ("source_external_id");--> statement-breakpoint
CREATE INDEX "sync_runs_status_started_idx" ON "sync_runs" USING btree ("status","started_at");