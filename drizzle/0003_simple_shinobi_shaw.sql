CREATE TABLE `collaboration_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collaboration_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`client_id` text NOT NULL,
	FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `collaboration_messages_room_idx` ON `collaboration_messages` (`collaboration_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `collaboration_messages_nonce_idx` ON `collaboration_messages` (`sender_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `collaboration_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`collaboration_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "collaboration_reviews_rating_check" CHECK("collaboration_reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collaboration_reviews_author_idx` ON `collaboration_reviews` (`collaboration_id`,`reviewer_id`);--> statement-breakpoint
CREATE TABLE `collaborations` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`brand_name` text NOT NULL,
	`company_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`status` text DEFAULT 'discussion' NOT NULL,
	`terms` text,
	`milestone` integer DEFAULT 0 NOT NULL,
	`submission` text,
	`cancellation_by` text,
	`accepted_at` integer,
	`completed_at` integer,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "collaborations_status_check" CHECK("collaborations"."status" in ('discussion', 'offer', 'active', 'submitted', 'completed', 'cancelled')),
	CONSTRAINT "collaborations_participants_check" CHECK("collaborations"."company_id" != "collaborations"."creator_id")
);
--> statement-breakpoint
CREATE INDEX `collaborations_company_idx` ON `collaborations` (`company_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `collaborations_creator_idx` ON `collaborations` (`creator_id`,`updated_at`);