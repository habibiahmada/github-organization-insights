import type { ScoreConfig } from "../types/index.js";
import { DEFAULT_SCORES } from "../types/index.js";

/**
 * Parse the year query parameter with validation.
 */
export function parseYear(year?: string | number): number {
  const currentYear = new Date().getFullYear();
  if (!year) return currentYear;

  const parsed = typeof year === "string" ? parseInt(year, 10) : year;

  if (isNaN(parsed) || parsed < 2000 || parsed > currentYear + 1) {
    return currentYear;
  }

  return parsed;
}

/**
 * Parse the fromYear query parameter.
 * Determines the start year for a range (e.g., from org creation to now).
 */
export function parseFromYear(fromYear?: string): number | undefined {
  if (!fromYear) return undefined;

  const parsed = parseInt(fromYear, 10);
  const currentYear = new Date().getFullYear();

  if (isNaN(parsed) || parsed < 2000 || parsed > currentYear) {
    return undefined;
  }

  return parsed;
}

/**
 * Parse score configuration from query parameters.
 * Expected format: "1,3,2,5,2,2,1"
 * Order: commit, pull_request, issue, release, discussion, review, comment
 */
export function parseScores(
  scores?: string
): Partial<ScoreConfig> | undefined {
  if (!scores) return undefined;

  const parts = scores.split(",").map(Number);
  if (parts.length !== 7 || parts.some(isNaN)) return undefined;

  return {
    commit: parts[0] || DEFAULT_SCORES.commit,
    pull_request: parts[1] || DEFAULT_SCORES.pull_request,
    issue: parts[2] || DEFAULT_SCORES.issue,
    release: parts[3] || DEFAULT_SCORES.release,
    discussion: parts[4] || DEFAULT_SCORES.discussion,
    review: parts[5] || DEFAULT_SCORES.review,
    comment: parts[6] || DEFAULT_SCORES.comment,
  };
}

/**
 * Parse a boolean query parameter.
 */
export function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;
  return value === "true" || value === "1" || value === "yes";
}

/**
 * Get the GitHub token from environment with fallback.
 */
export function getGitHubToken(): string {
  return process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
}

/**
 * Simple CORS headers for API responses.
 */
export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * Create a JSON error response.
 */
export function errorResponse(
  status: number,
  message: string
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
