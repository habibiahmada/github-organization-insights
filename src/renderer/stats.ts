import type { Theme } from "../types/index.js";
import { openSVG, closeSVG, rect, text, group, svgResponse } from "./svg.js";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

/**
 * Statistics card renderer for organization stats.
 */
export function renderStatsCard(
  stats: {
    totalContributions: number;
    totalRepos: number;
    activeDays: number;
    maxDay: number;
    averagePerDay: number;
    longestStreak: number;
    currentStreak: number;
    orgName: string;
    year: number;
  },
  theme: Theme,
): Response {
  const width = 480;
  const height = 200;

  const parts: string[] = [];

  parts.push(
    openSVG({
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    }),
  );

  // Background
  parts.push(
    rect({
      x: 0,
      y: 0,
      width,
      height,
      rx: 6,
      ry: 6,
      fill: theme.colors.background,
      stroke: theme.colors.border,
      strokeWidth: 1,
    }),
  );

  // Title
  parts.push(
    text({
      x: 20,
      y: 30,
      content: `${stats.orgName} — GitHub Insights ${stats.year}`,
      fill: theme.colors.text,
      fontSize: 16,
      fontFamily: FONT_FAMILY,
      fontWeight: "600",
    }),
  );

  // Stats grid: 2×3 layout
  const statItems = [
    {
      label: "Total Contributions",
      value: stats.totalContributions.toLocaleString(),
    },
    { label: "Active Days", value: stats.activeDays.toLocaleString() },
    { label: "Avg / Day", value: String(stats.averagePerDay) },
    { label: "Busiest Day", value: stats.maxDay.toLocaleString() },
    { label: "Longest Streak", value: `${stats.longestStreak} days` },
    { label: "Current Streak", value: `${stats.currentStreak} days` },
  ];

  const colWidth = width / 3;
  const row1Y = 60;
  const row2Y = 120;

  statItems.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 20 + col * colWidth;
    const y = row === 0 ? row1Y : row2Y;

    parts.push(
      text({
        x,
        y,
        content: item.value,
        fill: theme.colors.text,
        fontSize: 24,
        fontFamily: FONT_FAMILY,
        fontWeight: "600",
      }),
    );

    parts.push(
      text({
        x,
        y: y + 20,
        content: item.label,
        fill: theme.colors.dayLabel,
        fontSize: 11,
        fontFamily: FONT_FAMILY,
      }),
    );
  });

  // Footer
  parts.push(
    text({
      x: 20,
      y: height - 20,
      content: "Powered by org-graph.dev",
      fill: theme.colors.dayLabel,
      fontSize: 9,
      fontFamily: FONT_FAMILY,
    }),
  );

  parts.push(closeSVG());

  return svgResponse(parts.join("\n"));
}
