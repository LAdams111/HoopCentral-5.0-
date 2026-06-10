import { Router } from "express";
import { getAllLeagues, getLeagueBySlug } from "../services/league.service.js";

export const leaguesRouter = Router();

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
