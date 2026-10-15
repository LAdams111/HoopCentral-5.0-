import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { ingestKeysMatch } from "./ingest-auth.js";

/** Single profiles, counts, leagues, and teams. High enough that normal browsing never hits it. */
const BROWSE_PER_MINUTE = 240;
/** Search, class lists, birth-year lists, and rosters. Each call can return many players. */
const CATALOG_PER_MINUTE = 40;

function requestPath(req: Request): string {
  return req.originalUrl.split("?")[0] ?? req.path;
}

export function isPublicCatalogRequest(req: Request): boolean {
  if (req.method !== "GET") return false;
  const path = requestPath(req);
  if (path === "/api/players") return true;
  if (/^\/api\/players\/birth-year\/[^/]+$/.test(path)) return true;
  if (/^\/api\/players\/class-of\/[^/]+$/.test(path)) return true;
  if (/^\/api\/teams\/[^/]+\/roster\/[^/]+$/.test(path)) return true;
  return false;
}

function skipPublicLimit(req: Request): boolean {
  if (req.method === "OPTIONS") return true;
  const path = requestPath(req);
  if (path === "/api/health" || path.startsWith("/api/ingest")) return true;
  const expected = process.env.INGEST_API_KEY?.trim() ?? "";
  const provided = req.header("x-ingest-api-key") ?? "";
  if (expected && provided && ingestKeysMatch(provided, expected)) return true;
  return false;
}

function rateLimited(_req: Request, res: Response): void {
  res.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please wait a moment and try again.",
    },
  });
}

function limiter(limit: number, catalog: boolean) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimited,
    skip: (req) => skipPublicLimit(req) || isPublicCatalogRequest(req) !== catalog,
  });
}

export const publicBrowseLimiter = limiter(BROWSE_PER_MINUTE, false);
export const publicCatalogLimiter = limiter(CATALOG_PER_MINUTE, true);

/** One real profile view is a single call. This stops a loop from inflating the counter. */
export const profileViewLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimited,
});
