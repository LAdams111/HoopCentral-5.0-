import { Router } from "express";
import {
  getPlayerById,
  getPlayerCount,
  getSeasonCount,
  incrementProfileViews,
  searchPlayers,
} from "../services/player.service.js";

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
    const players = await searchPlayers({ q, page, limit });
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to search players" } });
  }
});

playersRouter.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: { code: "INVALID_ID", message: "Player id must be a number" } });
      return;
    }

    const player = await getPlayerById(id);
    if (!player) {
      res.status(404).json({ error: { code: "PLAYER_NOT_FOUND", message: "Player not found" } });
      return;
    }

    res.json(player);
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
