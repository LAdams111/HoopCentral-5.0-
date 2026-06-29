INSERT INTO "leagues" ("slug", "name")
VALUES ('ccaa', 'CCAA')
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name";
