/** A single day's contribution data */
export interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
  level: number; // 0-4 scale
}

/** A single week (7 days) */
export type WeekData = DayData[];

/** Full contribution matrix: 52+ weeks × 7 days */
export type ContributionMatrix = WeekData[];

/** Raw activity item from any source */
export interface ActivityItem {
  date: string; // YYYY-MM-DD
  type: ActivityType;
  repository: string;
  author: string;
  weight: number;
}

export type ActivityType =
  | "commit"
  | "pull_request"
  | "issue"
  | "release"
  | "discussion"
  | "review"
  | "comment";

/** Configurable scoring weights */
export interface ScoreConfig {
  commit: number;
  pull_request: number;
  issue: number;
  release: number;
  discussion: number;
  review: number;
  comment: number;
}

export const DEFAULT_SCORES: ScoreConfig = {
  commit: 1,
  pull_request: 3,
  issue: 2,
  release: 5,
  discussion: 2,
  review: 2,
  comment: 1,
};

/** Aggregated daily scores: date → total score */
export type DailyAggregation = Map<string, number>;

/** Graph query parameters */
export interface GraphQueryParams {
  org: string;
  theme?: string;
  year?: number;
  fromYear?: number;
  repo?: string;
  scores?: Partial<ScoreConfig>;
  includePrivate?: boolean;
}

/** Stats query parameters */
export interface StatsQueryParams {
  org: string;
  theme?: string;
  repo?: string;
}

/** GitHub API response wrapper */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  cached: boolean;
}
