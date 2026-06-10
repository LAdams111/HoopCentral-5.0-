import { Router } from "express";
import { getTeamCount } from "../services/player.service.js";
import { getTeamRoster, getTeamSeasons } from "../services/team.service.js";

export const teamsRouter = Router();

teamsRouter.get("/count", async (_req, res) => {
  try {
    const count = await getTeamCount();
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get team count" },
    });
  }
});

teamsRouter.get("/:team/seasons", async (req, res) => {
  try {
    const seasons = await getTeamSeasons(req.params.team);
    if (seasons.length === 0) {
      res.status(404).json({
        error: { code: "TEAM_NOT_FOUND", message: "Team not found" },
      });
      return;
    }
    res.json(seasons);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get team seasons" },
    });
  }
});

teamsRouter.get("/:team/roster/:season", async (req, res) => {
  try {
    const roster = await getTeamRoster(req.params.team, req.params.season);
    if (!roster) {
      res.status(404).json({
        error: { code: "TEAM_NOT_FOUND", message: "Team not found" },
      });
      return;
    }
    res.json(roster);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get team roster" },
    });
  }
});
