import { Router } from "express";
import { getAllLeagues, getFeaturedLeagues, getLeagueBySlug, searchLeagues } from "../services/league.service.js";

export const leaguesRouter = Router();

leaguesRouter.get("/featured", async (_req, res) => {
  try {
    const leagues = await getFeaturedLeagues();
    res.json(leagues);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get featured leagues" },
    });
  }
});

leaguesRouter.get("/search", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const leagues = await searchLeagues({ q, limit });
    res.json(leagues);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to search leagues" },
    });
  }
});

leaguesRouter.get("/", async (_req, res) => {
  try {
    const leagues = await getAllLeagues();
    res.json(leagues);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get leagues" },
    });
  }
});

leaguesRouter.get("/:slug", async (req, res) => {
  try {
    const league = await getLeagueBySlug(req.params.slug);
    if (!league) {
      res.status(404).json({
        error: { code: "LEAGUE_NOT_FOUND", message: "League not found" },
      });
      return;
    }
    res.json(league);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get league" },
    });
  }
});
