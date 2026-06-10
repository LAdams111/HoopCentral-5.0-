import { Router } from "express";
import { findOrCreatePlayerByIdentity } from "../services/player-identity.service.js";

export const devRouter = Router();

devRouter.post("/identity-test", async (req, res) => {
  try {
    const { source, externalId, displayName, birthDate, metadata } = req.body ?? {};

    if (
      typeof source !== "string" ||
      !source.trim() ||
      typeof externalId !== "string" ||
      !externalId.trim() ||
      typeof displayName !== "string" ||
      !displayName.trim()
    ) {
      res.status(400).json({
        error: {
          code: "INVALID_BODY",
          message: "source, externalId, and displayName are required strings",
        },
      });
      return;
    }

    const result = await findOrCreatePlayerByIdentity({
      source,
      externalId,
      displayName,
      birthDate: typeof birthDate === "string" ? birthDate : null,
      metadata:
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? (metadata as Record<string, unknown>)
          : undefined,
    });

    res.json({
      created: result.created,
      player: {
        id: result.player.id,
        slug: result.player.slug,
        displayName: result.player.displayName,
        birthDate: result.player.birthDate,
      },
      identity: {
        id: result.identity.id,
        source: result.identity.source,
        externalId: result.identity.externalId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Identity test failed" },
    });
  }
});
