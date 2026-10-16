import cors from "cors";
import type { RequestHandler } from "express";
import helmet from "helmet";

const allowedOrigins = new Set([
  "https://www.hoopcentral.net",
  "https://hoopcentral.net",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
]);

/**
 * Headers for www.hoopcentral.net.
 * Images stay open because logos and headshots come from many school and league sites.
 * The inline script and style allowances match the current page (Google Analytics and React styles).
 */
export const securityHeaders: RequestHandler = helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "https://www.googletagmanager.com", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: [
        "'self'",
        "https://www.google-analytics.com",
        "https://*.google-analytics.com",
        "https://*.analytics.google.com",
        "https://www.googletagmanager.com",
        "https://stats.g.doubleclick.net",
        "https://*.supabase.co",
      ],
    },
  },
});

export const siteCors: RequestHandler = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
});
