export function isPostgresUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

const TRANSIENT_PG_CODES = new Set([
  "40P01", // deadlock
  "53300", // too many connections
  "57P01", // admin shutdown
  "08006", // connection failure
  "08001", // sqlclient unable to establish connection
  "08004", // rejected connection
]);

export function isPostgresTransientError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;

  const code =
    "code" in err && typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : null;

  if (code && TRANSIENT_PG_CODES.has(code)) return true;

  const message =
    "message" in err && typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message.toLowerCase()
      : "";

  return (
    message.includes("timeout") ||
    message.includes("connection terminated") ||
    message.includes("too many clients")
  );
}
