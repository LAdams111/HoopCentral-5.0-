import { Router } from "express";
import { requireIngestApiKey } from "../middleware/ingest-auth.js";
import {
  IngestValidationError,
  ingestPlayerSeason,
  parseIngestPlayerSeasonBody,
} from "../services/ingest.service.js";

export const ingestRouter = Router();

ingestRouter.use(requireIngestApiKey);

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
