import type { ContributionMatrix, WeekData, DayData } from "../types/index.js";

/**
 * Matrix transformation utilities.
 * Handles conversion between different matrix formats
 * and provides query utilities.
 */

/**
 * Transpose a contribution matrix (weeks × days → days × weeks).
 */
export function transposeMatrix(matrix: ContributionMatrix): DayData[][] {
  const days: DayData[][] = [];
  for (let day = 0; day < 7; day++) {
    const dayColumn: DayData[] = [];
    for (let week = 0; week < matrix.length; week++) {
      if (matrix[week][day]) {
        dayColumn.push(matrix[week][day]);
      }
    }
    days.push(dayColumn);
  }
  return days;
}

/**
 * Filter matrix to only include days from a specific repository.
 */
export function filterByRepository(
  matrix: ContributionMatrix,
  _repoName: string
): ContributionMatrix {
  // Matrix doesn't contain per-repo info at this level;
  // filtering should happen before aggregation
  return matrix;
}

/**
 * Get total count for the matrix.
 */
export function getTotalCount(matrix: ContributionMatrix): number {
  let total = 0;
  for (const week of matrix) {
    for (const day of week) {
      total += day.count;
    }
  }
  return total;
}

/**
 * Get the highest single-day count.
 */
export function getMaxCount(matrix: ContributionMatrix): number {
  let max = 0;
  for (const week of matrix) {
    for (const day of week) {
      if (day.count > max) max = day.count;
    }
  }
  return max;
}

/**
 * Check if a specific date has contributions.
 */
export function hasContributions(
  matrix: ContributionMatrix,
  date: string
): boolean {
  for (const week of matrix) {
    for (const day of week) {
      if (day.date === date && day.count > 0) return true;
    }
  }
  return false;
}
