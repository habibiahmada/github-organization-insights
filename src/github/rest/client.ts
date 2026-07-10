import type { GitHubCommitActivity, GitHubEvent } from "../../types/index.js";

const GITHUB_REST_URL = "https://api.github.com";

/**
 * REST client for GitHub API endpoints that are suboptimal in GraphQL.
 */
export class GitHubRESTClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Get the current token (used by other services).
   */
  getToken(): string {
    return this.token;
  }

  private async fetch<T>(
    path: string,
    params?: Record<string, string | number>
  ): Promise<T> {
    const url = new URL(`${GITHUB_REST_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "org-graph/0.1.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub REST API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get weekly commit activity for a repository.
   * Returns the last 52 weeks of commit data.
   */
  async getCommitActivity(
    owner: string,
    repo: string
  ): Promise<GitHubCommitActivity[]> {
    return this.fetch<GitHubCommitActivity[]>(
      `/repos/${owner}/${repo}/stats/commit_activity`
    );
  }

  /**
   * Get the contribution calendar for a user in a repo.
   */
  async getContributorActivity(
    owner: string,
    repo: string
  ): Promise<
    Array<{
      author: { login: string; id: number };
      total: number;
      weeks: Array<{ w: number; a: number; d: number; c: number }>;
    }>
  > {
    return this.fetch<
      Array<{
        author: { login: string; id: number };
        total: number;
        weeks: Array<{ w: number; a: number; d: number; c: number }>;
      }>
    >(`/repos/${owner}/${repo}/stats/contributors`);
  }

  /**
   * Get public events for an organization.
   */
  async getOrganizationEvents(
    org: string,
    page: number = 1
  ): Promise<GitHubEvent[]> {
    return this.fetch<GitHubEvent[]>(
      `/orgs/${org}/events`,
      { per_page: 100, page }
    );
  }

  /**
   * Get recent commits for a repository.
   */
  async getCommits(
    owner: string,
    repo: string,
    params?: { since?: string; until?: string; per_page?: number; page?: number }
  ): Promise<
    Array<{
      sha: string;
      commit: {
        author: { date: string; name: string };
        message: string;
      };
      author: { login: string } | null;
    }>
  > {
    return this.fetch(
      `/repos/${owner}/${repo}/commits`,
      { per_page: params?.per_page ?? 100, page: params?.page ?? 1, ...params }
    );
  }

  /**
   * Check rate limit status.
   */
  async getRateLimit(): Promise<{
    resources: {
      core: { limit: number; remaining: number; reset: number };
      graphql: { limit: number; remaining: number; reset: number };
    };
  }> {
    return this.fetch("/rate_limit");
  }
}
