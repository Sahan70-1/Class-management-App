CREATE TABLE `events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation_id` text NOT NULL,
	`entity` text NOT NULL,
	`record_key` text NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`description` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_operation_id_unique` ON `events` (`operation_id`);--> statement-breakpoint
CREATE INDEX `events_entity` ON `events` (`entity`,`seq`);--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "member_role" CHECK("members"."role" IN ('admin','staff','viewer'))
);
--> statement-breakpoint
CREATE TABLE `records` (
	`entity` text NOT NULL,
	`record_key` text NOT NULL,
	`value` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`entity`, `record_key`)
);
--> statement-breakpoint
CREATE TABLE `schedule_lock` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "singleton_schedule_lock" CHECK("schedule_lock"."id" = 1)
);
