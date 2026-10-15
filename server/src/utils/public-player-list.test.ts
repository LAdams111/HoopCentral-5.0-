import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import type { Server } from "node:http";
import {
  publicBrowseLimiter,
  publicCatalogLimiter,
} from "../middleware/public-rate-limit.js";
import { publicPlayerListParams } from "./public-player-list.js";

describe("public player list", () => {
  it("keeps the homepage request on the first 50 players", () => {
    assert.deepEqual(publicPlayerListParams({}), {
      q: undefined,
      limit: 50,
      league: undefined,
      page: 1,
    });
  });

  it("keeps search on one page and allows the search page limit", () => {
    assert.deepEqual(
      publicPlayerListParams({ q: "  curry ", limit: "100", page: "40" }),
      { q: "curry", limit: 100, league: undefined, page: 1 },
    );
    assert.equal(publicPlayerListParams({ q: "bo", limit: "5" }).limit, 5);
  });

  it("does not treat a one-letter query as a catalog search", () => {
    const params = publicPlayerListParams({ q: "a", limit: "100", page: "3" });
    assert.equal(params.q, undefined);
    assert.equal(params.limit, 50);
    assert.equal(params.page, 1);
  });
});

describe("public rate limits", () => {
  it("slows catalog reads and leaves ingest alone", async () => {
    const app = express();
    app.set("trust proxy", 1);
    app.use("/api", publicBrowseLimiter);
    app.use("/api", publicCatalogLimiter);
    app.get("/api/players", (_req, res) => {
      res.json({ ok: true });
    });
    app.get("/api/players/:id", (_req, res) => {
      res.json({ ok: true });
    });
    app.get("/api/health", (_req, res) => {
      res.json({ ok: true });
    });
    app.post("/api/ingest/player-season", (_req, res) => {
      res.json({ ok: true });
    });

    const server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const catalogStatuses: number[] = [];
      for (let i = 0; i < 41; i += 1) {
        const response = await fetch(`${base}/api/players?page=${i}&limit=500`);
        catalogStatuses.push(response.status);
      }
      assert.equal(catalogStatuses.filter((status) => status === 200).length, 40);
      assert.equal(catalogStatuses[40], 429);

      const profile = await fetch(`${base}/api/players/15`);
      assert.equal(profile.status, 200);

      const health: number[] = [];
      const ingest: number[] = [];
      for (let i = 0; i < 45; i += 1) {
        health.push((await fetch(`${base}/api/health`)).status);
        ingest.push(
          (
            await fetch(`${base}/api/ingest/player-season`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: "{}",
            })
          ).status,
        );
      }
      assert.ok(health.every((status) => status === 200));
      assert.ok(ingest.every((status) => status === 200));
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
