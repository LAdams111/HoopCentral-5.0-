import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const payload = {
  source: "seed",
  externalId: "2544",
  player: {
    displayName: "LeBron James",
    birthDate: "1984-12-30",
    position: "F",
    heightCm: 206,
    weightKg: 113,
    hometown: "Akron, Ohio",
  },
  league: { slug: "nba", name: "NBA" },
  team: {
    slug: "los-angeles-lakers",
    name: "Los Angeles Lakers",
    abbreviation: "LAL",
  },
  season: { label: "2024-25" },
  stats: {
    gamesPlayed: 70,
    pointsPerGame: 24.4,
    reboundsPerGame: 7.8,
    assistsPerGame: 8.2,
  },
};

async function main() {
  const { closeDatabaseConnection } = await import("../server/src/db/index.js");
  const { ingestPlayerSeason } = await import(
    "../server/src/services/ingest.service.js"
  );

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log("First ingest (existing seed player)...");
  const first = await ingestPlayerSeason(payload);
  console.log(JSON.stringify(first, null, 2));

  console.log("\nSecond ingest (idempotent repeat)...");
  const second = await ingestPlayerSeason(payload);
  console.log(JSON.stringify(second, null, 2));

  await closeDatabaseConnection();
}

main().catch((err) => {
  console.error("Ingest test failed:", err);
  process.exit(1);
});
