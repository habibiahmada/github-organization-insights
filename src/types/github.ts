/** Raw GitHub organization data from API */
export interface GitHubOrganization {
  login: string;
  name: string;
  description: string | null;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  totalPrivateRepos?: number;
  membersCount: number;
  createdAt: string;
  updatedAt: string;
}

/** GitHub repository data */
export interface GitHubRepository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  language: string | null;
  languages: { name: string; size: number }[];
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  topics: string[];
  license: string | null;
}

/** Raw commit activity from REST API */
export interface GitHubCommitActivity {
  days: number[];
  total: number;
  week: number; // timestamp
}

/** Raw GitHub event (push, PR, issue, etc.) */
export interface GitHubEvent {
  id: string;
  type: GitHubEventType;
  actor: { login: string; avatarUrl: string };
  repo: { name: string; url: string };
  payload: Record<string, unknown>;
  createdAt: string;
}

export type GitHubEventType =
  | "PushEvent"
  | "PullRequestEvent"
  | "IssuesEvent"
  | "ReleaseEvent"
  | "CreateEvent"
  | "DeleteEvent"
  | "WatchEvent"
  | "ForkEvent"
  | "IssueCommentEvent"
  | "PullRequestReviewEvent"
  | "PullRequestReviewCommentEvent";

export interface GitHubMember {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions?: number;
}

/** GitHub API error response */
export interface GitHubError {
  message: string;
  documentationUrl?: string;
  status: number;
}

/** GraphQL pagination info */
export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}
