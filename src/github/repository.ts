import { GitHubRESTClient } from "./rest/client.js";
import type { GitHubCommitActivity } from "../types/index.js";

export class RepositoryService {
  private rest: GitHubRESTClient;

  constructor(token: string) {
    this.rest = new GitHubRESTClient(token);
  }

  /**
   * Get weekly commit activity for a repository.
   * Returns up to 52 weeks of data.
   */
  async getCommitActivity(
    owner: string,
    repo: string
  ): Promise<GitHubCommitActivity[]> {
    try {
      return await this.rest.getCommitActivity(owner, repo);
    } catch (error) {
      console.error(
        `Failed to fetch commit activity for ${owner}/${repo}:`,
        error
      );
      return [];
    }
  }

  /**
   * Check if a repository exists and is accessible.
   */
  async checkRepository(owner: string, repo: string): Promise<boolean> {
    try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${this.rest.getToken()}`,
          "User-Agent": "org-graph/0.1.0",
        },
      }
    );
      return response.ok;
    } catch {
      return false;
    }
  }
}
