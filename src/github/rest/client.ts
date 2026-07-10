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

  private async fetchInternal<T>(
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
    return this.fetchInternal<GitHubCommitActivity[]>(
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
    return this.fetchInternal<
      Array<{
        author: { login: string; id: number };
        total: number;
        weeks: Array<{ w: number; a: number; d: number; c: number }>;
      }>
    >(`/repos/${owner}/${repo}/stats/contributors`);
  }

  /**
   * Get public events for an organization.
   *
   * GitHub REST API returns snake_case fields (created_at, avatar_url),
   * so we map them to our camelCase interface here.
   */
  async getOrganizationEvents(
    org: string,
    page: number = 1
  ): Promise<GitHubEvent[]> {
    const raw = await this.fetchInternal<Array<Record<string, unknown>>>(
      `/orgs/${org}/events`,
      { per_page: 100, page }
    );

    return raw.map((e) => ({
      id: String(e.id ?? ""),
      type: (e.type as GitHubEvent["type"]) ?? "PushEvent",
      actor: {
        login: String((e.actor as Record<string, unknown> | undefined)?.login ?? ""),
        avatarUrl: String((e.actor as Record<string, unknown> | undefined)?.avatar_url ?? ""),
      },
      repo: {
        name: String((e.repo as Record<string, unknown> | undefined)?.name ?? ""),
        url: String((e.repo as Record<string, unknown> | undefined)?.url ?? ""),
      },
      payload: (e.payload ?? {}) as Record<string, unknown>,
      createdAt: String(e.created_at ?? ""),
    }));
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
    return this.fetchInternal(
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
    return this.fetchInternal("/rate_limit");
  }
}
