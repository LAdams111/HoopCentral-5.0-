import { Router } from "express";
import {
  getDefaultDraftYear,
  getDraftClass,
  getDraftYears,
} from "../services/draft.service.js";

export const draftRouter = Router();

draftRouter.get("/years", (_req, res) => {
  try {
    res.json({
      years: getDraftYears(),
      defaultYear: getDefaultDraftYear(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get draft years" } });
  }
});

draftRouter.get("/:year", async (req, res) => {
  try {
    const year = Number(req.params.year);
    if (!Number.isInteger(year) || year < 1960 || year > 2100) {
      res.status(400).json({ error: { code: "INVALID_YEAR", message: "Draft year must be a valid year" } });
      return;
    }

    const draftClass = await getDraftClass(year);
    if (!draftClass) {
      res.status(404).json({ error: { code: "DRAFT_NOT_FOUND", message: `No draft class for ${year}` } });
      return;
    }

    res.json(draftClass);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get draft class" } });
  }
});
