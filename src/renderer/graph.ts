import type { ContributionMatrix, Theme } from "../types/index.js";
import {
  openSVG,
  closeSVG,
  rect,
  text,
  group,
  tooltip,
  svgResponse,
  escapeXml,
} from "./svg.js";
import { getMonthLabels, getDayLabels } from "../core/calendar.js";

/** Cell dimensions */
const CELL_SIZE = 13;
const CELL_PADDING = 2;
const CELL_STEP = CELL_SIZE + CELL_PADDING;

/** Layout constants */
const MARGIN_LEFT = 54;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 20;
const LABEL_WIDTH = 28;
const ROW_LABEL_HEIGHT = 13;

/** Font configuration */
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

/**
 * Render a full contribution graph SVG.
 */
export function renderContributionGraph(
  matrix: ContributionMatrix,
  theme: Theme,
  org: string,
  year: number,
  repo?: string,
): Response {
  const totalWeeks = matrix.length;
  const graphWidth = totalWeeks * CELL_STEP;
  const graphHeight = 7 * CELL_STEP;
  const totalWidth = MARGIN_LEFT + graphWidth + CELL_PADDING;
  const totalHeight = MARGIN_TOP + graphHeight + MARGIN_BOTTOM;

  const parts: string[] = [];

  // SVG header
  parts.push(
    openSVG({
      width: totalWidth,
      height: totalHeight,
      viewBox: `0 0 ${totalWidth} ${totalHeight}`,
    }),
  );

  // Background
  parts.push(
    rect({
      x: 0,
      y: 0,
      width: totalWidth,
      height: totalHeight,
      fill: theme.colors.background,
    }),
  );

  // Title
  const title = repo
    ? `Contributions to ${org}/${repo} in ${year}`
    : `Contributions in ${org} during ${year}`;

  parts.push(
    text({
      x: MARGIN_LEFT,
      y: 16,
      content: title,
      fill: theme.colors.text,
      fontSize: 14,
      fontFamily: FONT_FAMILY,
      fontWeight: "600",
    }),
  );

  // Month labels
  const monthLabels = getMonthLabels(year, totalWeeks);
  for (const ml of monthLabels) {
    const x = MARGIN_LEFT + ml.weekIndex * CELL_STEP;
    parts.push(
      text({
        x,
        y: MARGIN_TOP - 8,
        content: ml.label,
        fill: theme.colors.monthLabel,
        fontSize: 10,
        fontFamily: FONT_FAMILY,
      }),
    );
  }

  // Day labels
  const dayLabels = getDayLabels();
  for (const dl of dayLabels) {
    if (!dl.label) continue;
    const y = MARGIN_TOP + dl.dayIndex * CELL_STEP + CELL_SIZE - 2;
    parts.push(
      text({
        x: MARGIN_LEFT - LABEL_WIDTH + 10,
        y,
        content: dl.label,
        fill: theme.colors.dayLabel,
        fontSize: 10,
        fontFamily: FONT_FAMILY,
      }),
    );
  }

  // Contribution cells
  let cellsContent = "";
  for (let week = 0; week < matrix.length; week++) {
    for (let day = 0; day < matrix[week].length; day++) {
      const dayData = matrix[week][day];
      const level = dayData.level;
      const fillColor = theme.colors.cells[level] ?? theme.colors.cells[0];

      const x = MARGIN_LEFT + week * CELL_STEP;
      const y = MARGIN_TOP + day * CELL_STEP;

      cellsContent += group(
        rect({
          x,
          y,
          width: CELL_SIZE,
          height: CELL_SIZE,
          rx: 2,
          ry: 2,
          fill: fillColor,
        }) + tooltip(`${dayData.count} contributions on ${dayData.date}`),
        undefined,
        fillColor,
      );
    }
  }

  parts.push(group(cellsContent));

  // Legend
  const legendX = MARGIN_LEFT;
  const legendY = MARGIN_TOP + graphHeight + 8;

  parts.push(
    text({
      x: legendX,
      y: legendY + 9,
      content: "Less",
      fill: theme.colors.dayLabel,
      fontSize: 10,
      fontFamily: FONT_FAMILY,
    }),
  );

  for (let i = 0; i < 5; i++) {
    const lx = legendX + 40 + i * (CELL_SIZE + CELL_PADDING);
    parts.push(
      rect({
        x: lx,
        y: legendY + 1,
        width: CELL_SIZE,
        height: CELL_SIZE,
        rx: 2,
        ry: 2,
        fill: theme.colors.cells[i],
        stroke: theme.colors.border,
        strokeWidth: 0.5,
      }),
    );
  }

  parts.push(
    text({
      x: legendX + 40 + 5 * (CELL_SIZE + CELL_PADDING) + 4,
      y: legendY + 9,
      content: "More",
      fill: theme.colors.dayLabel,
      fontSize: 10,
      fontFamily: FONT_FAMILY,
    }),
  );

  // Footer
  parts.push(
    text({
      x: MARGIN_LEFT,
      y: totalHeight - 10,
      content: `Powered by org-graph.dev • Data from GitHub API`,
      fill: theme.colors.dayLabel,
      fontSize: 9,
      fontFamily: FONT_FAMILY,
    }),
  );

  // SVG footer
  parts.push(closeSVG());

  return svgResponse(parts.join("\n"));
}

/**
 * Render a compact contribution graph (for badges or small embeds).
 */
export function renderCompactGraph(
  matrix: ContributionMatrix,
  theme: Theme,
  org: string,
  year: number,
): Response {
  // Compact version: smaller cells, no labels
  const COMPACT_CELL = 10;
  const COMPACT_STEP = COMPACT_CELL + 1;
  const COMPACT_MARGIN = 10;

  const totalWeeks = matrix.length;
  const graphWidth = totalWeeks * COMPACT_STEP;
  const totalWidth = graphWidth + COMPACT_MARGIN * 2;
  const totalHeight = 7 * COMPACT_STEP + COMPACT_MARGIN * 2;

  const parts: string[] = [];

  parts.push(
    openSVG({
      width: totalWidth,
      height: totalHeight,
      viewBox: `0 0 ${totalWidth} ${totalHeight}`,
    }),
  );

  parts.push(
    rect({
      x: 0,
      y: 0,
      width: totalWidth,
      height: totalHeight,
      fill: "transparent",
    }),
  );

  for (let week = 0; week < matrix.length; week++) {
    for (let day = 0; day < matrix[week].length; day++) {
      const dayData = matrix[week][day];
      const fillColor =
        theme.colors.cells[dayData.level] ?? theme.colors.cells[0];
      const x = COMPACT_MARGIN + week * COMPACT_STEP;
      const y = COMPACT_MARGIN + day * COMPACT_STEP;

      parts.push(
        rect({
          x,
          y,
          width: COMPACT_CELL,
          height: COMPACT_CELL,
          rx: 1,
          ry: 1,
          fill: fillColor,
        }),
      );
    }
  }

  parts.push(closeSVG());

  return svgResponse(parts.join("\n"));
}

export { getMonthLabels } from "../core/calendar.js";
