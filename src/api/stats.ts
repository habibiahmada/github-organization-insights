import type { Context } from "hono";
import { InsightsService } from "../services/index.js";
import { getToken } from "../auth/index.js";
import { renderStatsCard } from "../renderer/stats.js";
import { getTheme } from "../core/theme.js";
import { parseYear, parseFromYear, parseBoolean, getGitHubToken, errorResponse } from "../utils/index.js";

/**
 * GET /api/stats
 *
 * Returns a statistics SVG card for the specified organization.
 *
 * Query parameters:
 *   org      - GitHub organization name (required)
 *   theme    - Theme name (default: github-dark)
 *   year     - Target year (default: current year)
 *   fromYear - Start year for range (e.g., 2020 shows all from 2020 to now)
 *   private  - Include private repos (default: true if token available)
 */
export async function handleStatsRequest(c: Context): Promise<Response> {
  const org = c.req.query("org");

  if (!org) {
    return errorResponse(400, "Missing required parameter: org");
  }

  const token = getToken(c.req.header("Authorization")) || getGitHubToken();

  if (!token) {
    return errorResponse(
      401,
      "GitHub token not configured. Set GITHUB_TOKEN environment variable."
    );
  }

  const year = parseYear(c.req.query("year"));
  const fromYear = parseFromYear(c.req.query("fromYear"));
  const themeName = c.req.query("theme") ?? "github-dark";
  const includePrivate = parseBoolean(c.req.query("private"));

  try {
    const service = new InsightsService(token);
    const result = await service.getStats({
      org,
      token,
      year,
      fromYear,
      includePrivate,
    });

    const theme = getTheme(themeName);
    const totalRepos = await service.getOrgRepositoryCount(org, includePrivate ?? true);

    const response = renderStatsCard(
      {
        ...result.stats,
        totalRepos,
        orgName: result.orgName,
        year: result.year,
      },
      theme
    );

    const headers = new Headers({
      "X-Cache": result.cached ? "HIT" : "MISS",
      "Access-Control-Allow-Origin": "*",
    });

    response.headers.forEach((v, k) => headers.set(k, v));

    return new Response(await response.text(), {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error("Stats generation error:", error);
    return errorResponse(
      500,
      `Failed to generate stats: ${(error as Error).message}`
    );
  }
}
