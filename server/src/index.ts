import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { checkDatabaseConnection } from "./db/index.js";
import { draftRouter } from "./routes/draft.js";
import { leaguesRouter } from "./routes/leagues.js";
import { devRouter } from "./routes/dev.js";
import { ingestRouter } from "./routes/ingest.js";
import { playersRouter, statsRouter } from "./routes/players.js";
import { teamsRouter } from "./routes/teams.js";
import { getFeaturedPlayers, getProspectPlayers, runDailySyntheticProfileViews } from "./services/player.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

dotenv.config({ path: path.resolve(projectRoot, ".env") });

const PORT = Number(process.env.PORT) || 3001;
const isProd =
  process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT !== undefined;

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const dbCheck = await checkDatabaseConnection();

  res.json({
    status: dbCheck.connected ? "ok" : "degraded",
    database: dbCheck.connected ? "connected" : "disconnected",
    latencyMs: dbCheck.latencyMs,
    error: dbCheck.error,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/featured-players", async (_req, res) => {
  try {
    const players = await getFeaturedPlayers(5);
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get featured players" } });
  }
});

app.get("/api/prospect-players", async (_req, res) => {
  try {
    const players = await getProspectPlayers();
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get prospect players" } });
  }
});

app.use("/api/leagues", leaguesRouter);
app.use("/api/draft", draftRouter);
app.use("/api/players", playersRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/ingest", ingestRouter);
app.use("/api", statsRouter);

if (!isProd) {
  app.use("/api/dev", devRouter);
}

if (isProd) {
  const clientDist = path.resolve(projectRoot, "client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hoop Central running on port ${PORT} (${isProd ? "production" : "development"})`);

  if (isProd) {
    const checkDailyProfileViews = () => {
      void runDailySyntheticProfileViews()
        .then((result) => {
          if (!result.skipped && result.updated > 0) {
            console.log(
              `Daily synthetic profile views: added 1–6 views for ${result.updated.toLocaleString()} players`,
            );
          }
        })
        .catch((err) => {
          console.error("Daily synthetic profile views failed:", err);
        });
    };

    checkDailyProfileViews();
    setInterval(checkDailyProfileViews, 60 * 60 * 1000);
  }
});
