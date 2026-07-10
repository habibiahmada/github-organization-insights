import type { PageInfo } from "../../types/index.js";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

/**
 * GraphQL client for GitHub API.
 * Handles authentication, query execution, and pagination.
 */
export class GitHubGraphQLClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Execute a GraphQL query against GitHub's API.
   */
  async query<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "org-graph/0.1.0",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub GraphQL API error: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      throw new Error(
        `GitHub GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`
      );
    }

    return json.data as T;
  }

  /**
   * Paginate through a connection, collecting all nodes.
   */
  async paginate<T>(
    query: string,
    variables: Record<string, unknown>,
    extractPage: (data: unknown) => {
      nodes: T[];
      pageInfo: PageInfo;
    }
  ): Promise<T[]> {
    const allNodes: T[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const data = await this.query<unknown>(query, {
        ...variables,
        after: cursor,
      });

      const page = extractPage(data);
      allNodes.push(...page.nodes);
      hasNextPage = page.pageInfo.hasNextPage;
      cursor = page.pageInfo.endCursor;
    }

    return allNodes;
  }
}
