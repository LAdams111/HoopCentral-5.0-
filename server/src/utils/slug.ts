export function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeSlugParam(slug: string): string {
  return decodeURIComponent(slug).trim().toLowerCase();
}
