import { Router } from "express";
import { profileViewLimiter } from "../middleware/public-rate-limit.js";
import { findDraftPickForPlayer } from "../services/draft.service.js";
import {
  getBirthYearCounts,
  getClassOfCounts,
  getPlayerById,
  getPlayerCount,
  getPlayersByBirthYear,
  getPlayersByClassOf,
  getSeasonCount,
  incrementProfileViews,
  searchPlayers,
} from "../services/player.service.js";
import { getPlayerGameLogs } from "../services/player-game-log.service.js";
import { publicPlayerListParams } from "../utils/public-player-list.js";

export const playersRouter = Router();

playersRouter.get("/count", async (_req, res) => {
  try {
    const count = await getPlayerCount();
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get player count" } });
  }
});

playersRouter.get("/", async (req, res) => {
  try {
    const { q, page, limit, league } = publicPlayerListParams(req.query);
    const players = await searchPlayers({ q, page, limit, league });
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to search players" } });
  }
});

playersRouter.get("/birth-year-counts", async (_req, res) => {
  try {
    const counts = await getBirthYearCounts();
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get birth year counts" } });
  }
});

playersRouter.get("/class-of-counts", async (_req, res) => {
  try {
    const counts = await getClassOfCounts();
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get class counts" } });
  }
});

playersRouter.get("/class-of/:year", async (req, res) => {
  try {
    const year = Number(req.params.year);
    if (Number.isNaN(year) || year < 1950 || year > 2040) {
      res.status(400).json({ error: { code: "INVALID_YEAR", message: "Class year must be a valid graduation year" } });
      return;
    }

    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = await getPlayersByClassOf(year, { page: 1, limit });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get players by class" } });
  }
});

playersRouter.get("/birth-year/:year", async (req, res) => {
  try {
    const year = Number(req.params.year);
    if (Number.isNaN(year) || year < 1900 || year > 2100) {
      res.status(400).json({ error: { code: "INVALID_YEAR", message: "Birth year must be a valid year" } });
      return;
    }

    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = await getPlayersByBirthYear(year, { page: 1, limit });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get players by birth year" } });
  }
});

playersRouter.get("/:id/game-logs", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const season = typeof req.query.season === "string" ? req.query.season.trim() : "";
    const league = typeof req.query.league === "string" ? req.query.league.trim() : "";
    if (Number.isNaN(id) || !season) {
      res.status(400).json({
        error: { code: "INVALID_REQUEST", message: "Player id and season are required" },
      });
      return;
    }
    const games = await getPlayerGameLogs(id, season, league || undefined);
    res.json({ playerId: id, season, games });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get game logs" },
    });
  }
});

playersRouter.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: { code: "INVALID_ID", message: "Player id must be a number" } });
      return;
    }

    const league = typeof req.query.league === "string" ? req.query.league : undefined;
    const player = await getPlayerById(id, { league });
    if (!player) {
      res.status(404).json({ error: { code: "PLAYER_NOT_FOUND", message: "Player not found" } });
      return;
    }

    res.json({
      ...player,
      draft: await findDraftPickForPlayer({
        id,
        name: player.name,
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get player" } });
  }
});

playersRouter.post("/:id/view", profileViewLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: { code: "INVALID_ID", message: "Player id must be a number" } });
      return;
    }
    await incrementProfileViews(id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to increment views" } });
  }
});

export const statsRouter = Router();

statsRouter.get("/seasons/count", async (_req, res) => {
  try {
    const count = await getSeasonCount();
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get season count" } });
  }
});
