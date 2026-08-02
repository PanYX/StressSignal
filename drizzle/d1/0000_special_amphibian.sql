CREATE TABLE `daily_commentaries` (
	`id` text PRIMARY KEY NOT NULL,
	`as_of_date` text NOT NULL,
	`scope` text NOT NULL,
	`headline` text NOT NULL,
	`summary` text NOT NULL,
	`body_md` text NOT NULL,
	`model` text NOT NULL,
	`inputs_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_commentaries_asof_scope_uq` ON `daily_commentaries` (`as_of_date`,`scope`);--> statement-breakpoint
CREATE INDEX `daily_commentaries_scope_idx` ON `daily_commentaries` (`scope`);--> statement-breakpoint
CREATE TABLE `indicator_snapshots` (
	`indicator_id` text PRIMARY KEY NOT NULL,
	`latest_value` real,
	`latest_date` text,
	`change_1d` real,
	`change_5d` real,
	`change_20d` real,
	`pct_rank_1y` real,
	`zscore_1y` real,
	`state_label` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`indicator_id`) REFERENCES `indicators`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `indicator_snapshots_updated_idx` ON `indicator_snapshots` (`updated_at`);--> statement-breakpoint
CREATE TABLE `indicator_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`indicator_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`fetch_mode` text NOT NULL,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`license_note` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`indicator_id`) REFERENCES `indicators`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `indicator_sources_indicator_idx` ON `indicator_sources` (`indicator_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `indicator_sources_mapping_uq` ON `indicator_sources` (`indicator_id`,`provider`,`external_id`);--> statement-breakpoint
CREATE TABLE `indicators` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`unit` text NOT NULL,
	`frequency` text NOT NULL,
	`status` text NOT NULL,
	`source_policy` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `indicators_slug_uq` ON `indicators` (`slug`);--> statement-breakpoint
CREATE INDEX `indicators_frequency_idx` ON `indicators` (`frequency`);--> statement-breakpoint
CREATE INDEX `indicators_status_idx` ON `indicators` (`status`);--> statement-breakpoint
CREATE INDEX `indicators_category_idx` ON `indicators` (`category`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`indicator_id` text NOT NULL,
	`observation_date` text NOT NULL,
	`value` real NOT NULL,
	`raw_payload` text NOT NULL,
	`source_provider` text NOT NULL,
	`source_external_id` text NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`indicator_id`) REFERENCES `indicators`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `observations_indicator_date_uq` ON `observations` (`indicator_id`,`source_external_id`,`observation_date`);--> statement-breakpoint
CREATE INDEX `observations_indicator_date_idx` ON `observations` (`indicator_id`,`observation_date`);--> statement-breakpoint
CREATE INDEX `observations_source_external_idx` ON `observations` (`source_external_id`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`job_name` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`records_upserted` integer,
	`error_message` text,
	`meta` text
);
--> statement-breakpoint
CREATE INDEX `sync_runs_status_started_idx` ON `sync_runs` (`status`,`started_at`);