import type {
  ActivityItem,
  ContributionMatrix,
  ScoreConfig,
} from "../types/index.js";
import { OrganizationService } from "../github/organization.js";
import { RepositoryService } from "../github/repository.js";
import { ActivityService } from "../github/activity.js";
import { Aggregator } from "../core/aggregator.js";
import { Scorer } from "../core/scorer.js";
import { MemoryCache, buildGraphCacheKey, buildStatsCacheKey } from "../cache/index.js";
import { getTheme, getAllThemes } from "../core/theme.js";
import type { Theme } from "../types/theme.js";

/**
 * Options for fetching contribution data.
 */
export interface GraphOptions {
  org: string;
  token: string;
  year?: number;
  /** If set, show data from this year up to `year` (or current year) */
  fromYear?: number;
  repo?: string;
  theme?: string;
  scores?: Partial<ScoreConfig>;
  includePrivate?: boolean;
}

/**
 * Global cache singleton — persists across all requests.
 */
const globalCache = new MemoryCache();

/**
 * Organization Insights Service.
 *
 * Orchestrates the full pipeline:
 * GitHub API → Activity Collection → Scoring → Aggregation → Matrix
 */
export class InsightsService {
  private orgService: OrganizationService;
  private repoService: RepositoryService;
  private activityService: ActivityService;
  private scorer: Scorer;

  constructor(token: string) {
    this.orgService = new OrganizationService(token);
    this.repoService = new RepositoryService(token);
    this.activityService = new ActivityService(token);
    this.scorer = new Scorer();
  }

  /**
   * Get contribution graph data for an organization.
   * Returns the contribution matrix ready for rendering.
   */
  async getContributionGraph(options: GraphOptions): Promise<{
    matrix: ContributionMatrix;
    theme: Theme;
    stats: ReturnType<Aggregator["getStats"]>;
    cached: boolean;
  }> {
    const year = options.year ?? new Date().getFullYear();
    const themeName = options.theme ?? "github-dark";
    const fromYear = options.fromYear;
    const cacheKey = buildGraphCacheKey({
      org: options.org,
      theme: themeName,
      year,
      fromYear,
      repo: options.repo,
    });

    // Try global cache first
    const cached = await globalCache.get<{
      matrix: ContributionMatrix;
      stats: ReturnType<Aggregator["getStats"]>;
    }>(cacheKey);

    if (cached) {
      return {
        matrix: cached.matrix,
        theme: getTheme(themeName),
        stats: cached.stats,
        cached: true,
      };
    }

    // Update scorer configuration
    if (options.scores) {
      this.scorer.updateConfig(options.scores);
    }

    // Determine year range
    const rangeFromYear = options.fromYear ?? year;
    const currentYear = new Date().getFullYear();
    const endYear = options.fromYear ? currentYear : year;
    const yearsToFetch: number[] = [];

    for (let y = rangeFromYear; y <= endYear; y++) {
      yearsToFetch.push(y);
    }

    // Fetch repositories (include private by default when token is available)
    const includePrivate = options.includePrivate ?? true;
    const repos = await this.orgService.getRepositories(
      options.org,
      includePrivate
    );

    let targetRepos = repos
      .filter((r) => !r.isArchived && !r.isFork);

    if (options.repo) {
      targetRepos = targetRepos.filter(
        (r) => r.name === options.repo
      );
    }

    // Collect activities for all years — parallelized across years & repos
    const allActivities: ActivityItem[] = [];

    const yearRepoPromises: Promise<ActivityItem[]>[] = [];

    for (const y of yearsToFetch) {
      const since = `${y}-01-01T00:00:00Z`;
      const until = `${y}-12-31T23:59:59Z`;

      // Fetch activities for all repos in parallel for this year
      for (const repo of targetRepos) {
        yearRepoPromises.push(
          this.activityService.getAllRepositoryActivities(
            options.org,
            repo.name,
            since,
            until
          )
        );
      }

      // Also fetch org-level events for this year
      yearRepoPromises.push(
        this.activityService.getOrganizationEvents(options.org).then((events) =>
          events.filter(
            (e) => e.date >= `${y}-01-01` && e.date <= `${y}-12-31`
          )
        )
      );
    }

    const results = await Promise.all(yearRepoPromises);
    for (const activities of results) {
      allActivities.push(...activities);
    }

    // Aggregate (use the end year for the matrix)
    const aggregator = new Aggregator(this.scorer);
    const matrix = aggregator.aggregate(allActivities, endYear);
    const stats = aggregator.getStats(matrix);

    // Cache the result
    await globalCache.set(cacheKey, { matrix, stats });

    return {
      matrix,
      theme: getTheme(themeName),
      stats,
      cached: false,
    };
  }

  /**
   * Get organization statistics.
   */
  async getStats(options: GraphOptions): Promise<{
    stats: ReturnType<Aggregator["getStats"]>;
    orgName: string;
    year: number;
    cached: boolean;
  }> {
    const year = options.year ?? new Date().getFullYear();
    const cacheKey = buildStatsCacheKey({
      org: options.org,
      year,
    });

    const cached = await globalCache.get<{
      stats: ReturnType<Aggregator["getStats"]>;
    }>(cacheKey);

    if (cached) {
      const org = await this.orgService.getOrganization(options.org);
      return {
        stats: cached.stats,
        orgName: org?.name ?? options.org,
        year,
        cached: true,
      };
    }

    const result = await this.getContributionGraph(options);
    const org = await this.orgService.getOrganization(options.org);

    await globalCache.set(cacheKey, { stats: result.stats });

    return {
      stats: result.stats,
      orgName: org?.name ?? options.org,
      year,
      cached: false,
    };
  }

  /**
   * Get the total repository count for an organization (with context).
   */
  async getOrgRepositoryCount(
    org: string,
    includePrivate: boolean = true
  ): Promise<number> {
    const repos = await this.orgService.getRepositories(org, includePrivate);
    return repos.filter((r) => !r.isArchived && !r.isFork).length;
  }

  /**
   * Get a list of themes.
   */
  getThemes(): Theme[] {
    return getAllThemes();
  }

  /**
   * Invalidate cache for an organization.
   */
  async invalidateCache(org: string): Promise<void> {
    await globalCache.delPattern(`graph:${org}:*`);
    await globalCache.delPattern(`stats:${org}:*`);
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; keys: string[] } {
    return globalCache.getStats();
  }
}
