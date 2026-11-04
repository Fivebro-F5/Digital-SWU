CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" geometry(Point, 4326) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "places_location_gist" ON "places" USING gist ("location");
