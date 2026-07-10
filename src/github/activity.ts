import type {
  ActivityItem,
  ActivityType,
  GitHubCommitActivity,
} from "../types/index.js";
import { GitHubRESTClient } from "./rest/client.js";
import { GitHubGraphQLClient } from "./graphql/client.js";
import { COMMIT_HISTORY_QUERY } from "./graphql/queries.js";

type CommitNode = {
  committedDate: string;
  author: {
    name: string;
    user: { login: string } | null;
  } | null;
};

interface CommitHistoryResult {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          totalCount: number;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: CommitNode[];
        };
      };
    } | null;
  } | null;
}

export class ActivityService {
  private graphql: GitHubGraphQLClient;
  private rest: GitHubRESTClient;

  constructor(token: string) {
    this.graphql = new GitHubGraphQLClient(token);
    this.rest = new GitHubRESTClient(token);
  }

  /**
   * Get commit activity for a repository via GraphQL.
   * More flexible than REST stats endpoint (supports date range).
   */
  async getCommits(
    owner: string,
    repo: string,
    since: string,
    until: string
  ): Promise<ActivityItem[]> {
    try {
      const allCommits: Array<{
        committedDate: string;
        author: { name: string; user: { login: string } | null } | null;
      }> = [];

      // Try GraphQL first
      try {
        const nodes = await this.graphql.paginate<CommitNode>(
          COMMIT_HISTORY_QUERY,
          { owner, repo, since, until },
          (data: unknown) => {
          const d = data as CommitHistoryResult;
          const branch = d.repository?.defaultBranchRef;
          const history = branch?.target?.history;
          if (!history) return { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
          return {
            nodes: history.nodes,
            pageInfo: history.pageInfo,
          };
          }
        );
        allCommits.push(...nodes);
      } catch {
        // Fallback to REST API
        const commits = await this.rest.getCommits(owner, repo, {
          since,
          until,
          per_page: 100,
        });
        allCommits.push(
          ...commits.map((c) => ({
            committedDate: c.commit.author?.date ?? "",
            author: c.author
              ? { name: c.commit.author?.name ?? "", user: c.author }
              : null,
          }))
        );
      }

      return allCommits
        .filter((c) => c.committedDate)
        .map((c) => ({
          date: c.committedDate.split("T")[0], // YYYY-MM-DD
          type: "commit" as ActivityType,
          repository: repo,
          author: c.author?.user?.login ?? c.author?.name ?? "unknown",
          weight: 1,
        }));
    } catch (error) {
      console.error(`Failed to fetch commits for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get commit activity from REST stats endpoint (aggregated weekly).
   */
  async getWeeklyCommitActivity(
    owner: string,
    repo: string
  ): Promise<ActivityItem[]> {
    const weeklyData = await this.rest.getCommitActivity(owner, repo);
    const activities: ActivityItem[] = [];

    for (const week of weeklyData) {
      const weekDate = new Date(week.week * 1000);
      for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
        const count = week.days[dayIndex];
        if (count > 0) {
          const date = new Date(weekDate);
          date.setDate(date.getDate() + dayIndex);
          activities.push({
            date: date.toISOString().split("T")[0],
            type: "commit",
            repository: repo,
            author: "unknown",
            weight: count,
          });
        }
      }
    }

    return activities;
  }

  /**
   * Fetch recent events for an organization and convert to activities.
   */
  async getOrganizationEvents(
    org: string
  ): Promise<ActivityItem[]> {
    try {
      const events = await this.rest.getOrganizationEvents(org);
      return events.map((event) => {
        const { type, weight } = this.mapEventType(event.type);
        return {
          date: event.createdAt.split("T")[0],
          type,
          repository: event.repo.name.split("/")[1],
          author: event.actor.login,
          weight,
        };
      });
    } catch (error) {
      console.error(`Failed to fetch events for ${org}:`, error);
      return [];
    }
  }

  /**
   * Get pull requests for a repository.
   */
  async getPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "all"
  ): Promise<ActivityItem[]> {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=100&sort=updated&direction=desc`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.rest.getToken()}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "org-graph/0.1.0",
        },
      });

      if (!response.ok) return [];

      const pulls = (await response.json()) as Array<{
        created_at: string;
        merged_at: string | null;
        closed_at: string | null;
        user: { login: string };
        title: string;
      }>;

      return pulls.map((pr) => ({
        date: (pr.merged_at ?? pr.created_at).split("T")[0],
        type: "pull_request" as ActivityType,
        repository: repo,
        author: pr.user.login,
        weight: 3,
      }));
    } catch (error) {
      console.error(`Failed to fetch PRs for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get issues for a repository.
   */
  async getIssues(
    owner: string,
    repo: string,
    since: string
  ): Promise<ActivityItem[]> {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&sort=updated&direction=desc&since=${since}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.rest.getToken()}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "org-graph/0.1.0",
        },
      });

      if (!response.ok) return [];

      const issues = (await response.json()) as Array<{
        created_at: string;
        closed_at: string | null;
        user: { login: string };
        pull_request?: unknown;
      }>;

      // Filter out pull requests (GitHub includes PRs in issues endpoint)
      return issues
        .filter((issue) => !issue.pull_request)
        .map((issue) => ({
          date: (issue.closed_at ?? issue.created_at).split("T")[0],
          type: "issue" as ActivityType,
          repository: repo,
          author: issue.user.login,
          weight: 2,
        }));
    } catch (error) {
      console.error(`Failed to fetch issues for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get releases for a repository.
   */
  async getReleases(
    owner: string,
    repo: string
  ): Promise<ActivityItem[]> {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=50`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.rest.getToken()}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "org-graph/0.1.0",
        },
      });

      if (!response.ok) return [];

      const releases = (await response.json()) as Array<{
        created_at: string;
        author: { login: string };
        tag_name: string;
      }>;

      return releases.map((release) => ({
        date: release.created_at.split("T")[0],
        type: "release" as ActivityType,
        repository: repo,
        author: release.author.login,
        weight: 5,
      }));
    } catch (error) {
      console.error(`Failed to fetch releases for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Collect all activities for a repository in a date range.
   * Uses REST weekly stats as primary commit source (avoids double counting),
   * with GraphQL fallback. Also fetches PRs, issues, and releases.
   */
  async getAllRepositoryActivities(
    owner: string,
    repo: string,
    since: string,
    until: string
  ): Promise<ActivityItem[]> {
    const sinceDate = since.split("T")[0];
    const untilDate = until.split("T")[0];

    // Run all activity fetches in parallel
    const [weeklyCommits, graphqlCommits, prs, issues, releases] =
      await Promise.all([
        // 1. REST weekly stats (preferred — aggregated, no double counting)
        this.getWeeklyCommitActivity(owner, repo).catch(() => [] as ActivityItem[]),
        // 2. GraphQL commits (fallback — only used if REST weekly stats return nothing)
        this.getCommits(owner, repo, since, until).catch(() => [] as ActivityItem[]),
        // 3. Pull requests
        this.getPullRequests(owner, repo),
        // 4. Issues
        this.getIssues(owner, repo, since),
        // 5. Releases
        this.getReleases(owner, repo),
      ]);

    const all: ActivityItem[] = [];

    // Use REST weekly stats if available, otherwise use GraphQL commits
    if (weeklyCommits.length > 0) {
      for (const activity of weeklyCommits) {
        if (activity.date >= sinceDate && activity.date <= untilDate) {
          all.push(activity);
        }
      }
    } else {
      // Fallback to GraphQL commits (each commit = 1 point)
      for (const activity of graphqlCommits) {
        if (activity.date >= sinceDate && activity.date <= untilDate) {
          all.push(activity);
        }
      }
    }

    // Add PRs
    for (const pr of prs) {
      if (pr.date >= sinceDate && pr.date <= untilDate) {
        all.push(pr);
      }
    }

    // Add issues
    for (const issue of issues) {
      if (issue.date >= sinceDate && issue.date <= untilDate) {
        all.push(issue);
      }
    }

    // Add releases
    for (const release of releases) {
      if (release.date >= sinceDate && release.date <= untilDate) {
        all.push(release);
      }
    }

    return all;
  }

  /**
   * Map GitHub event types to our normalized activity types.
   */
  private mapEventType(
    eventType: string
  ): { type: ActivityType; weight: number } {
    const eventMap: Record<string, { type: ActivityType; weight: number }> = {
      PushEvent: { type: "commit", weight: 1 },
      PullRequestEvent: { type: "pull_request", weight: 3 },
      IssuesEvent: { type: "issue", weight: 2 },
      ReleaseEvent: { type: "release", weight: 5 },
      IssueCommentEvent: { type: "comment", weight: 1 },
      PullRequestReviewEvent: { type: "review", weight: 2 },
      PullRequestReviewCommentEvent: { type: "comment", weight: 1 },
      CreateEvent: { type: "commit", weight: 1 },
      DeleteEvent: { type: "commit", weight: 1 },
      WatchEvent: { type: "commit", weight: 0 },
      ForkEvent: { type: "commit", weight: 0 },
    };

    return (
      eventMap[eventType] ?? { type: "commit" as ActivityType, weight: 1 }
    );
  }
}
