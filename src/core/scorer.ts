import type { ActivityItem, ScoreConfig, DailyAggregation } from "../types/index.js";
import { DEFAULT_SCORES } from "../types/index.js";

/**
 * Scoring engine that converts activity items into weighted daily scores.
 * Supports per-repository and per-activity-type configuration.
 */
export class Scorer {
  private config: ScoreConfig;

  constructor(config?: Partial<ScoreConfig>) {
    this.config = { ...DEFAULT_SCORES, ...config };
  }

  /**
   * Update the scoring configuration.
   */
  updateConfig(config: Partial<ScoreConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current scoring configuration.
   */
  getConfig(): ScoreConfig {
    return { ...this.config };
  }

  /**
   * Score a single activity item and return its weighted contribution.
   */
  scoreActivity(activity: ActivityItem): number {
    return activity.weight * (this.config[activity.type] ?? 1);
  }

  /**
   * Score multiple activities and aggregate by date.
   */
  aggregateByDate(
    activities: ActivityItem[],
    filterAuthor?: string
  ): DailyAggregation {
    const daily: DailyAggregation = new Map();

    for (const activity of activities) {
      if (filterAuthor && activity.author !== filterAuthor) continue;

      const score = this.scoreActivity(activity);
      const current = daily.get(activity.date) ?? 0;
      daily.set(activity.date, current + score);
    }

    return daily;
  }

  /**
   * Merge multiple daily aggregations into one.
   */
  static mergeAggregations(
    ...aggregations: DailyAggregation[]
  ): DailyAggregation {
    const merged: DailyAggregation = new Map();

    for (const agg of aggregations) {
      for (const [date, score] of agg) {
        const current = merged.get(date) ?? 0;
        merged.set(date, current + score);
      }
    }

    return merged;
  }
}
