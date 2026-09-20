import { Router } from "express";
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
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const league = typeof req.query.league === "string" ? req.query.league : undefined;
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

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = await getPlayersByClassOf(year, { page, limit });
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

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = await getPlayersByBirthYear(year, { page, limit });
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
    if (Number.isNaN(id) || !season) {
      res.status(400).json({
        error: { code: "INVALID_REQUEST", message: "Player id and season are required" },
      });
      return;
    }
    const games = await getPlayerGameLogs(id, season);
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
      draft: findDraftPickForPlayer({
        name: player.name,
        birthDate: player.birthDate,
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get player" } });
  }
});

playersRouter.post("/:id/view", async (req, res) => {
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
