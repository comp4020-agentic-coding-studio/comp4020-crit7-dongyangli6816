CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_code` text NOT NULL,
	`activity` text NOT NULL,
	`group` text NOT NULL,
	`kind` text NOT NULL,
	`day` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`location` text NOT NULL,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `completed_courses` (
	`student_id` text NOT NULL,
	`course_code` text NOT NULL,
	PRIMARY KEY(`student_id`, `course_code`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`units` integer NOT NULL,
	`mode` text NOT NULL,
	`description` text NOT NULL,
	`requisite_text` text NOT NULL,
	`convener` text,
	`class_start` text,
	`class_end` text,
	`enrol_by` text,
	`census` text,
	`source_url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text NOT NULL,
	`course_code` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_student_id_course_code_unique` ON `enrolments` (`student_id`,`course_code`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`program` text NOT NULL
);
