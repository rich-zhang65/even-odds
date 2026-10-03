-- Edited by hand from drizzle-kit's output, which added the column NOT NULL in
-- one step and would fail on a table that already has rows. Existing accounts
-- take the part of their email before the @, then the constraints go on.
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
UPDATE "users" SET "username" = split_part("email", '@', 1);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_has_no_at" CHECK (position('@' in "users"."username") = 0);
