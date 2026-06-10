import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildAllTestPayloads,
  type IngestPayload,
  UNIQUE_PAYLOAD_COUNT,
} from "./ingest-test-payloads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

interface IngestResponse {
  ok: true;
  playerId: number;
  created: {
    player: boolean;
    league: boolean;
    team: boolean;
    season: boolean;
    stint: boolean;
    stats: boolean;
  };
}

interface Summary {
  totalPayloads: number;
  uniquePayloads: number;
  duplicatePayloads: number;
  successfulWrites: number;
  failedWrites: number;
  createdPlayers: number;
  reusedPlayers: number;
  createdLeagues: number;
  createdTeams: number;
  createdSeasons: number;
  createdStints: number;
  createdStatsRows: number;
  failures: { label: string; status: number; message: string }[];
}

function baseUrl(): string {
  const port = process.env.PORT || "3001";
  return (
    process.env.INGEST_API_URL?.replace(/\/$/, "") ||
    process.env.API_URL?.replace(/\/$/, "") ||
    `http://localhost:${port}`
  );
}

function payloadLabel(payload: IngestPayload): string {
  return `${payload.source}/${payload.externalId} · ${payload.league.slug} · ${payload.season.label}`;
}

function emptySummary(total: number): Summary {
  return {
    totalPayloads: total,
    uniquePayloads: UNIQUE_PAYLOAD_COUNT,
    duplicatePayloads: total - UNIQUE_PAYLOAD_COUNT,
    successfulWrites: 0,
    failedWrites: 0,
    createdPlayers: 0,
    reusedPlayers: 0,
    createdLeagues: 0,
    createdTeams: 0,
    createdSeasons: 0,
    createdStints: 0,
    createdStatsRows: 0,
    failures: [],
  };
}

async function checkServer(url: string): Promise<void> {
  const healthUrl = `${url}/api/health`;
  let res: Response;

  try {
    res = await fetch(healthUrl);
  } catch {
    throw new Error(
      `Cannot reach ${healthUrl}. Start the API with "npm run dev" in another terminal.`,
    );
  }

  if (!res.ok) {
    throw new Error(`Health check failed (${res.status}) at ${healthUrl}`);
  }
}

async function postPayload(
  url: string,
  payload: IngestPayload,
  apiKey?: string,
): Promise<{ ok: true; data: IngestResponse } | { ok: false; status: number; message: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-ingest-api-key"] = apiKey;
  }

  const res = await fetch(`${url}/api/ingest/player-season`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => null)) as
    | IngestResponse
    | { error?: { message?: string } }
    | null;

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: body?.error?.message ?? res.statusText,
    };
  }

  if (!body || !("ok" in body) || body.ok !== true) {
    return { ok: false, status: res.status, message: "Unexpected response shape" };
  }

  return { ok: true, data: body };
}

function printSummary(summary: Summary): void {
  console.log("\n=== Ingest Test Summary ===");
  console.log(`Total payloads sent:     ${summary.totalPayloads}`);
  console.log(`  Unique payloads:       ${summary.uniquePayloads}`);
  console.log(`  Duplicate payloads:    ${summary.duplicatePayloads}`);
  console.log(`Successful writes:       ${summary.successfulWrites}`);
  console.log(`Failed writes:           ${summary.failedWrites}`);
  console.log(`Created players:         ${summary.createdPlayers}`);
  console.log(`Reused players:          ${summary.reusedPlayers}`);
  console.log(`Created leagues:         ${summary.createdLeagues}`);
  console.log(`Created teams:           ${summary.createdTeams}`);
  console.log(`Created seasons:         ${summary.createdSeasons}`);
  console.log(`Created stints:          ${summary.createdStints}`);
  console.log(`Created stats rows:      ${summary.createdStatsRows}`);

  if (summary.failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of summary.failures) {
      console.log(`  - ${failure.label}: ${failure.status} ${failure.message}`);
    }
  }
}

async function main() {
  const url = baseUrl();
  const apiKey = process.env.INGEST_API_KEY;
  const payloads = buildAllTestPayloads();

  console.log(`Ingest test target: ${url}`);
  console.log(
    `Sending ${payloads.length} payloads (${UNIQUE_PAYLOAD_COUNT} unique + ${payloads.length - UNIQUE_PAYLOAD_COUNT} duplicates)...`,
  );

  await checkServer(url);

  const summary = emptySummary(payloads.length);

  for (const payload of payloads) {
    const result = await postPayload(url, payload, apiKey);
    const label = payloadLabel(payload);

    if (!result.ok) {
      summary.failedWrites += 1;
      summary.failures.push({
        label,
        status: result.status,
        message: result.message,
      });
      console.log(`FAIL  ${label}`);
      continue;
    }

    summary.successfulWrites += 1;
    const { created, playerId } = result.data;

    if (created.player) summary.createdPlayers += 1;
    else summary.reusedPlayers += 1;
    if (created.league) summary.createdLeagues += 1;
    if (created.team) summary.createdTeams += 1;
    if (created.season) summary.createdSeasons += 1;
    if (created.stint) summary.createdStints += 1;
    if (created.stats) summary.createdStatsRows += 1;

    console.log(
      `OK    ${label} → player #${playerId}` +
        (created.player ? " [new player]" : " [existing player]"),
    );
  }

  printSummary(summary);

  if (summary.failedWrites > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
