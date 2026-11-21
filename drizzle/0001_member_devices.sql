CREATE TABLE `member_devices` (
	`email` text NOT NULL,
	`device_id` text NOT NULL,
	`label` text NOT NULL,
	`last_seen` text NOT NULL,
	PRIMARY KEY(`email`, `device_id`),
	FOREIGN KEY (`email`) REFERENCES `members`(`email`) ON UPDATE no action ON DELETE cascade
);
