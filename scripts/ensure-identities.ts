import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export async function ensurePlayerIdentities(options?: { closeConnection?: boolean }) {
  const { closeDatabaseConnection, db } = await import("../server/src/db/index.js");
  const schema = await import("../server/src/db/schema/index.js");
  const shouldClose = options?.closeConnection ?? true;

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Skipping identity ensure.");
    return;
  }

  const allPlayers = await db
    .select({
      id: schema.players.id,
      slug: schema.players.slug,
    })
    .from(schema.players);

  let added = 0;
  for (const player of allPlayers) {
    const inserted = await db
      .insert(schema.playerIdentities)
      .values({
        playerId: player.id,
        source: "manual",
        externalId: player.slug,
      })
      .onConflictDoNothing({
        target: [
          schema.playerIdentities.source,
          schema.playerIdentities.externalId,
        ],
      })
      .returning({ id: schema.playerIdentities.id });

    if (inserted.length > 0) added += 1;
  }

  if (added > 0) {
    console.log(`Ensured player identities: added ${added} manual identity row(s).`);
  }

  if (shouldClose) {
    await closeDatabaseConnection();
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  ensurePlayerIdentities().catch((err) => {
    console.error("Ensure identities failed:", err);
    process.exit(1);
  });
}
