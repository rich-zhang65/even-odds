CREATE TABLE "match_players" (
	"match_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"seat" text NOT NULL,
	CONSTRAINT "match_players_match_id_seat_pk" PRIMARY KEY("match_id","seat"),
	CONSTRAINT "match_players_one_seat_each" UNIQUE("match_id","user_id"),
	CONSTRAINT "match_players_seat_is_a_seat" CHECK ("match_players"."seat" in ('p0', 'p1'))
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"winner" text,
	"reason" text,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	CONSTRAINT "matches_winner_is_a_seat" CHECK ("matches"."winner" in ('p0', 'p1'))
);
--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_players_user_id_idx" ON "match_players" USING btree ("user_id");