import type { NextFunction, Request, Response } from "express";

export function requireIngestApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.INGEST_API_KEY;
  if (!expected) {
    next();
    return;
  }

  const provided = req.header("x-ingest-api-key");
  if (provided !== expected) {
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
