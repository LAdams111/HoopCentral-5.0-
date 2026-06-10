import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { checkDatabaseConnection } from "./db/index.js";
import { playersRouter, statsRouter } from "./routes/players.js";
import { getFeaturedPlayers } from "./services/player.service.js";

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

  if (!dbCheck.connected) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      error: dbCheck.error,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    status: "ok",
    database: "connected",
    latencyMs: dbCheck.latencyMs,
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

app.use("/api/players", playersRouter);
app.use("/api", statsRouter);

if (isProd) {
  const clientDist = path.resolve(projectRoot, "client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hoop Central running on port ${PORT} (${isProd ? "production" : "development"})`);
});
