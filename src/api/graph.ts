import type { Context } from "hono";
import { InsightsService } from "../services/index.js";
import { getToken } from "../auth/index.js";
import {
  renderContributionGraph,
  renderCompactGraph,
} from "../renderer/graph.js";
import {
  parseYear,
  parseFromYear,
  parseScores,
  parseBoolean,
  getGitHubToken,
  errorResponse,
} from "../utils/index.js";

/**
 * GET /api/graph
 *
 * Returns a contribution graph SVG for the specified organization.
 *
 * Query parameters:
 *   org      - GitHub organization name (required)
 *   theme    - Theme name (default: github-dark)
 *   year     - Target year (default: current year)
 *   fromYear - Start year for range (e.g., 2020 shows all from 2020 to now)
 *   repo     - Filter by repository name (optional)
 *   scores   - Custom score weights as comma-separated values (optional)
 *   compact  - Return compact version (optional)
 *   scope    - Data scope: all, member, public
 *   private  - Include private repos (default: true if token available)
 */
export async function handleGraphRequest(c: Context): Promise<Response> {
  const org = c.req.query("org");

  if (!org) {
    return errorResponse(400, "Missing required parameter: org");
  }

  // Rate limiting check would go here
  // ...

  const token = getToken(c.req.header("Authorization")) || getGitHubToken();

  if (!token) {
    return errorResponse(
      401,
      "GitHub token not configured. Set GITHUB_TOKEN environment variable.",
    );
  }

  const year = parseYear(c.req.query("year"));
  const fromYear = parseFromYear(c.req.query("fromYear"));
  const themeName = c.req.query("theme") ?? "github-dark";
  const repo = c.req.query("repo") ?? undefined;
  const scores = parseScores(c.req.query("scores"));
  const compact = parseBoolean(c.req.query("compact"));
  const scope = c.req.query("scope");
  let includePrivate: boolean | undefined;

  if (scope === "public") {
    includePrivate = false;
  } else if (scope === "member") {
    includePrivate = true;
  } else {
    includePrivate = parseBoolean(c.req.query("private"));
  }

  try {
    const service = new InsightsService(token);
    const result = await service.getContributionGraph({
      org,
      token,
      year,
      fromYear,
      repo,
      theme: themeName,
      scores,
      includePrivate,
    });

    // Add cache header
    const headers = new Headers({
      "X-Cache": result.cached ? "HIT" : "MISS",
      "X-Cache-Age": result.cached ? "cached" : "fresh",
      "Access-Control-Allow-Origin": "*",
    });

    if (compact) {
      const response = renderCompactGraph(
        result.matrix,
        result.theme,
        org,
        year,
      );
      response.headers.forEach((v, k) => headers.set(k, v));
      return new Response(await response.text(), {
        headers,
        status: 200,
      });
    }

    const response = renderContributionGraph(
      result.matrix,
      result.theme,
      org,
      year,
      repo,
    );

    // Merge headers
    response.headers.forEach((v, k) => headers.set(k, v));

    return new Response(await response.text(), {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error("Graph generation error:", error);
    return errorResponse(
      500,
      `Failed to generate contribution graph: ${(error as Error).message}`,
    );
  }
}
