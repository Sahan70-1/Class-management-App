CREATE TABLE `classroom_events` (
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
CREATE UNIQUE INDEX `classroom_events_operation_id_unique` ON `classroom_events` (`operation_id`);--> statement-breakpoint
CREATE INDEX `classroom_events_entity` ON `classroom_events` (`entity`,`seq`);--> statement-breakpoint
CREATE TABLE `classroom_records` (
	`entity` text NOT NULL,
	`record_key` text NOT NULL,
	`value` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`entity`, `record_key`)
);
