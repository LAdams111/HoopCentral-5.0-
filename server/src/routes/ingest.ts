import { Router } from "express";
import { requireIngestApiKey } from "../middleware/ingest-auth.js";
import {
  IngestValidationError,
  ingestPlayerSeason,
  parseIngestPlayerSeasonBody,
} from "../services/ingest.service.js";
import {
  ingestPlayerBio,
  parseIngestPlayerBioBody,
} from "../services/ingest-bio.service.js";
import { getCompletionStatusBySource } from "../services/ingest-status.service.js";
import {
  clearPlayerNcaaSeasons,
  parseClearPlayerNcaaSeasonsBody,
} from "../services/ingest-clear-ncaa.service.js";
import {
  ingestMergePlayers,
  parseMergePlayersBody,
} from "../services/ingest-merge.service.js";

export const ingestRouter = Router();

ingestRouter.use(requireIngestApiKey);

ingestRouter.get("/completion-status", async (req, res) => {
  try {
    const source =
      typeof req.query.source === "string" && req.query.source.trim()
        ? req.query.source.trim()
        : "balldontlie";
    const league =
      typeof req.query.league === "string" && req.query.league.trim()
        ? req.query.league.trim()
        : undefined;
    const players = await getCompletionStatusBySource(source, league);
    res.json({ source, league, players });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to load completion status" },
    });
  }
});

ingestRouter.post("/player-season", async (req, res) => {
  try {
    const input = parseIngestPlayerSeasonBody(req.body);
    const result = await ingestPlayerSeason(input);
    res.json(result);
  } catch (err) {
    if (err instanceof IngestValidationError) {
      res.status(400).json({
        error: { code: "INVALID_BODY", message: err.message },
      });
      return;
    }

    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to ingest player season" },
    });
  }
});

ingestRouter.post("/player-bio", async (req, res) => {
  try {
    const input = parseIngestPlayerBioBody(req.body);
    const result = await ingestPlayerBio(input);
    res.json(result);
  } catch (err) {
    if (err instanceof IngestValidationError) {
      res.status(400).json({
        error: { code: "INVALID_BODY", message: err.message },
      });
      return;
    }

    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to ingest player bio" },
    });
  }
});

ingestRouter.post("/clear-player-ncaa-seasons", async (req, res) => {
  try {
    const input = parseClearPlayerNcaaSeasonsBody(req.body);
    const result = await clearPlayerNcaaSeasons(input);
    res.json(result);
  } catch (err) {
    if (err instanceof IngestValidationError) {
      res.status(400).json({
        error: { code: "INVALID_BODY", message: err.message },
      });
      return;
    }

    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to clear NCAA seasons" },
    });
  }
});

ingestRouter.post("/merge-players", async (req, res) => {
  try {
    const input = parseMergePlayersBody(req.body);
    const result = await ingestMergePlayers(input);
    res.json(result);
  } catch (err) {
    if (err instanceof IngestValidationError) {
      res.status(400).json({
        error: { code: "INVALID_BODY", message: err.message },
      });
      return;
    }

    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to merge players" },
    });
  }
});
