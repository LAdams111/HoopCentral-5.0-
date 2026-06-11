import { Router } from "express";
import { getTeamCount } from "../services/player.service.js";
import {
  getAllTeams,
  getTeamBySlug,
  getTeamRecord,
  getTeamRoster,
  getTeamSeasons,
} from "../services/team.service.js";

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

teamsRouter.get("/all", async (req, res) => {
  try {
    const leagueSlug =
      typeof req.query.league === "string" ? req.query.league : undefined;
    const teams = await getAllTeams(leagueSlug);
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get teams" },
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

teamsRouter.get("/:team/record/:season", async (req, res) => {
  try {
    const record = await getTeamRecord(req.params.team, req.params.season);
    if (!record) {
      res.status(404).json({
        error: { code: "RECORD_NOT_FOUND", message: "Team record not found" },
      });
      return;
    }
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get team record" },
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

teamsRouter.get("/:slug", async (req, res) => {
  try {
    const team = await getTeamBySlug(req.params.slug);
    if (!team) {
      res.status(404).json({
        error: { code: "TEAM_NOT_FOUND", message: "Team not found" },
      });
      return;
    }
    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get team" },
    });
  }
});
