INSERT INTO "leagues" ("slug", "name", "gender")
VALUES ('high-school-w', 'High School (Girls)', 'female')
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "gender" = EXCLUDED."gender";--> statement-breakpoint
UPDATE "leagues"
SET "name" = 'High School (Boys)', "gender" = 'male'
WHERE "slug" = 'high-school';
