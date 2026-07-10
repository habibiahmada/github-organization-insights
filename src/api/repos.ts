import type { Context } from "hono";
import { OrganizationService } from "../github/organization.js";
import { getToken } from "../auth/index.js";
import { getGitHubToken, errorResponse } from "../utils/index.js";

/**
 * GET /api/repos
 *
 * Returns a list of repositories for the organization.
 *
 * Query parameters:
 *   org     - GitHub organization name (required)
 *   private - Include private repos (requires auth as org member)
 *   format  - Response format: json (default) or svg
 *   theme   - Theme name (for SVG format, default: github-dark)
 */
export async function handleReposRequest(c: Context): Promise<Response> {
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

  const includePrivate = c.req.query("private") === "true";
  const format = c.req.query("format") ?? "json";

  try {
    const service = new OrganizationService(token);
    const repos = await service.getRepositories(org, includePrivate);

    if (format === "svg") {
      // Return SVG representation (simplified for now)
      const repoList = repos.slice(0, 20).map(
        (r, i) =>
          `<text x="20" y="${30 + i * 22}" font-size="12" fill="#e6edf3">${r.name}</text>`
      ).join("\n");

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${30 + repos.length * 22 + 20}">
        <rect width="100%" height="100%" fill="#0d1117"/>
        <text x="20" y="20" font-size="14" font-weight="bold" fill="#e6edf3">${org} Repositories</text>
        ${repoList}
      </svg>`;

      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Default: JSON format
    const repoData = repos.map((r) => ({
      name: r.name,
      description: r.description,
      private: r.isPrivate,
      archived: r.isArchived,
      language: r.language,
      stars: r.stargazersCount,
      forks: r.forksCount,
      issues: r.openIssuesCount,
      topics: r.topics,
      updatedAt: r.updatedAt,
    }));

    return new Response(JSON.stringify(repoData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Repos fetch error:", error);
    return errorResponse(
      500,
      `Failed to fetch repositories: ${(error as Error).message}`
    );
  }
}
