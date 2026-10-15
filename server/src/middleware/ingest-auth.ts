import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT !== undefined
  );
}

/** Compare secrets without leaking which character mismatched. */
export function ingestKeysMatch(provided: string, expected: string): boolean {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export function requireIngestApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.INGEST_API_KEY?.trim() ?? "";
  if (!expected) {
    if (isProductionRuntime()) {
      res.status(503).json({
        error: {
          code: "INGEST_NOT_CONFIGURED",
          message: "Ingest is not configured",
        },
      });
      return;
    }
    next();
    return;
  }

  const provided = req.header("x-ingest-api-key") ?? "";
  if (!provided || !ingestKeysMatch(provided, expected)) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing x-ingest-api-key header",
      },
    });
    return;
  }

  next();
}
