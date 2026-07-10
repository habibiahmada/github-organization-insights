import type {
  ActivityItem,
  DailyAggregation,
  ContributionMatrix,
  WeekData,
  DayData,
} from "../types/index.js";
import { Scorer } from "./scorer.js";
import { getCalendarConfig, formatDate } from "./calendar.js";

/**
 * Aggregation Engine — the core of the system.
 *
 * Input: Raw activity items from various sources (commits, PRs, issues, etc.)
 * Process: Score them → aggregate by day → build weekly matrix
 * Output: A contribution matrix (53 weeks × 7 days) ready for rendering
 */
export class Aggregator {
  private scorer: Scorer;

  constructor(scorer: Scorer) {
    this.scorer = scorer;
  }

  /**
   * Main pipeline: activities → daily scores → contribution matrix.
   */
  aggregate(
    activities: ActivityItem[],
    year: number,
    filterAuthor?: string
  ): ContributionMatrix {
    // Step 1: Score and aggregate by date
    const dailyScores = this.scorer.aggregateByDate(activities, filterAuthor);

    // Step 2: Build the contribution matrix
    return this.buildMatrix(dailyScores, year);
  }

  /**
   * Convert daily scores into a 53×7 contribution matrix.
   *
   * GitHub contribution graph layout:
   * - Columns = weeks (52-53)
   * - Rows = days (Sun=0, Mon=1, ..., Sat=6)
   * - Start date = previous December's last Sunday
   * - End date = last day of the year
   */
  private buildMatrix(
    dailyScores: DailyAggregation,
    year: number
  ): ContributionMatrix {
    const config = getCalendarConfig(year);
    const matrix: ContributionMatrix = [];
    const maxScore = this.getMaxScore(dailyScores);

    const currentDate = new Date(config.startDate);

    for (let week = 0; week < config.totalWeeks; week++) {
      const weekData: WeekData = [];

      for (let day = 0; day < 7; day++) {
        const dateStr = formatDate(currentDate);
        const score = dailyScores.get(dateStr) ?? 0;
        const isInYear = currentDate.getFullYear() === year;

        weekData.push({
          date: dateStr,
          count: score,
          level: isInYear ? this.getLevel(score, maxScore) : 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      matrix.push(weekData);
    }

    return matrix;
  }

  /**
   * Determine the contribution level (0-4) based on the score.
   * GitHub's algorithm: divides contributions into quartiles.
   */
  private getLevel(score: number, maxScore: number): number {
    if (score === 0) return 0;
    if (maxScore === 0) return 0;

    const ratio = score / maxScore;

    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  }

  /**
   * Get the maximum score for normalization.
   */
  private getMaxScore(dailyScores: DailyAggregation): number {
    let max = 0;
    for (const score of dailyScores.values()) {
      if (score > max) max = score;
    }
    return max;
  }

  /**
   * Calculate summary statistics from the matrix.
   */
  getStats(matrix: ContributionMatrix): {
    totalContributions: number;
    totalDays: number;
    activeDays: number;
    maxDay: number;
    averagePerDay: number;
    longestStreak: number;
    currentStreak: number;
  } {
    let total = 0;
    let activeDays = 0;
    let maxDay = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    const allDays = matrix.flat();
    const today = formatDate(new Date());

    for (const day of allDays) {
      total += day.count;
      if (day.count > 0) {
        activeDays++;
        tempStreak++;
        if (day.count > maxDay) maxDay = day.count;

        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }

      // Current streak (from today backwards)
      // We'll compute this separately
    }

    // Compute current streak (consecutive days with contributions ending today)
    const reversedDays = [...allDays].reverse();
    currentStreak = 0;
    for (const day of reversedDays) {
      if (day.count > 0) {
        currentStreak++;
      } else {
        // Only stop if we've passed the most recent day
        if (currentStreak > 0 || day.date <= today) break;
      }
    }

    const totalDays = allDays.filter(
      (d) => d.date >= `${new Date().getFullYear()}-01-01`
    ).length;

    return {
      totalContributions: total,
      totalDays,
      activeDays,
      maxDay,
      averagePerDay: totalDays > 0 ? Math.round((total / totalDays) * 10) / 10 : 0,
      longestStreak,
      currentStreak,
    };
  }
}
