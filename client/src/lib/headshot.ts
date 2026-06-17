import type { SyntheticEvent } from "react";
import { DEFAULT_HEADSHOT } from "@/lib/constants";

const BAD_HEADSHOT_PATTERNS = [
  /favicon/i,
  /apple-touch-icon/i,
  /\/logos?\//i,
  /logo\.svg/i,
  /ssref\.net\/req\/.*\/favicons/i,
];

export function sanitizeHeadshotUrl(url: string | null | undefined): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";
  if (BAD_HEADSHOT_PATTERNS.some((pattern) => pattern.test(trimmed))) return "";
  return trimmed;
}

export function resolvePlayerHeadshot(url: string | null | undefined): string {
  return sanitizeHeadshotUrl(url) || DEFAULT_HEADSHOT;
}

export function onHeadshotError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.src = DEFAULT_HEADSHOT;
}
