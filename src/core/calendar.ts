/**
 * Calendar utility functions for generating contribution graph layouts.
 */

export interface CalendarConfig {
  year: number;
  /** First day of the graph (Sunday-based) */
  startDate: Date;
  /** Last day of the graph */
  endDate: Date;
  /** Total weeks in the calendar */
  totalWeeks: number;
  /** Day of week for start (0=Sunday, 6=Saturday) */
  startDayOfWeek: number;
}

/**
 * Generate calendar configuration for a given year.
 */
export function getCalendarConfig(year: number): CalendarConfig {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  // Adjust start date to the previous Sunday
  const startDayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDayOfWeek);

  // Calculate total weeks
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysDiff = Math.round(
    (endDate.getTime() - startDate.getTime()) / msPerDay
  );
  const totalWeeks = Math.ceil((daysDiff + 1) / 7);

  return {
    year,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    totalWeeks,
    startDayOfWeek,
  };
}

/**
 * Get all days in a year as an array of date strings (YYYY-MM-DD).
 */
export function getAllDaysInYear(year: number): string[] {
  const days: string[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  const current = new Date(start);
  while (current <= end) {
    days.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Format a Date object to YYYY-MM-DD string.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get the ISO week number for a date.
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

/**
 * Get month labels for the graph header.
 * Returns array of { label, weekIndex } where weekIndex is the column position.
 */
export function getMonthLabels(
  year: number,
  totalWeeks: number
): Array<{ label: string; weekIndex: number }> {
  const labels: Array<{ label: string; weekIndex: number }> = [];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  let lastMonth = -1;
  for (let week = 0; week < totalWeeks; week++) {
    const date = new Date(year, 0, 1);
    date.setDate(date.getDate() + week * 7);
    const month = date.getMonth();

    if (month !== lastMonth) {
      labels.push({ label: monthNames[month], weekIndex: week });
      lastMonth = month;
    }
  }

  return labels;
}

/**
 * Get day labels for the side of the graph.
 */
export function getDayLabels(): Array<{ label: string; dayIndex: number }> {
  return [
    { label: "Mon", dayIndex: 1 },
    { label: "", dayIndex: 3 },
    { label: "Fri", dayIndex: 5 },
  ];
}
