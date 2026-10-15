import assert from "node:assert/strict";
import type { Server } from "node:http";
import { afterEach, describe, it } from "node:test";
import express from "express";
import { requireIngestApiKey } from "./ingest-auth.js";
import { securityHeaders, siteCors } from "./security.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalRailwayEnv = process.env.RAILWAY_ENVIRONMENT;
const originalKey = process.env.INGEST_API_KEY;

afterEach(() => {
  restore("NODE_ENV", originalNodeEnv);
  restore("RAILWAY_ENVIRONMENT", originalRailwayEnv);
  restore("INGEST_API_KEY", originalKey);
});

function restore(name: "NODE_ENV" | "RAILWAY_ENVIRONMENT" | "INGEST_API_KEY", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

async function withServer(
  app: express.Express,
  run: (base: string) => Promise<void>,
): Promise<void> {
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("ingest API key", () => {
  it("stays open locally when no key is configured", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.INGEST_API_KEY;

    const app = express();
    app.post("/api/ingest/player-season", requireIngestApiKey, (_req, res) => {
      res.json({ ok: true });
    });

    await withServer(app, async (base) => {
      const response = await fetch(`${base}/api/ingest/player-season`, { method: "POST" });
      assert.equal(response.status, 200);
    });
  });

  it("refuses production ingest when no key is configured", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.INGEST_API_KEY;

    const app = express();
    app.post("/api/ingest/player-season", requireIngestApiKey, (_req, res) => {
      res.json({ ok: true });
    });

    await withServer(app, async (base) => {
      const response = await fetch(`${base}/api/ingest/player-season`, { method: "POST" });
      assert.equal(response.status, 503);
    });
  });

  it("accepts only the matching key", async () => {
    process.env.NODE_ENV = "production";
    process.env.INGEST_API_KEY = "test-key-value";

    const app = express();
    app.post("/api/ingest/player-season", requireIngestApiKey, (_req, res) => {
      res.json({ ok: true });
    });

    await withServer(app, async (base) => {
      const missing = await fetch(`${base}/api/ingest/player-season`, { method: "POST" });
      assert.equal(missing.status, 401);

      const wrong = await fetch(`${base}/api/ingest/player-season`, {
        method: "POST",
        headers: { "x-ingest-api-key": "other-key" },
      });
      assert.equal(wrong.status, 401);

      const right = await fetch(`${base}/api/ingest/player-season`, {
        method: "POST",
        headers: { "x-ingest-api-key": "test-key-value" },
      });
      assert.equal(right.status, 200);
    });
  });
});

describe("public security headers", () => {
  it("allows the site and blocks another website from reading the API", async () => {
    const app = express();
    app.use(securityHeaders);
    app.use(siteCors);
    app.get("/", (_req, res) => {
      res.type("html").send("<html></html>");
    });

    await withServer(app, async (base) => {
      const page = await fetch(base);
      const csp = page.headers.get("content-security-policy") ?? "";
      assert.match(csp, /script-src[^;]*googletagmanager/);
      assert.match(csp, /img-src[^;]*https:/);
      assert.equal(page.headers.get("x-content-type-options"), "nosniff");

      const site = await fetch(base, { headers: { origin: "https://www.hoopcentral.net" } });
      assert.equal(site.headers.get("access-control-allow-origin"), "https://www.hoopcentral.net");

      const stranger = await fetch(base, { headers: { origin: "https://evil.example" } });
      assert.equal(stranger.headers.get("access-control-allow-origin"), null);
    });
  });
});
