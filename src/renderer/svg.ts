/**
 * Low-level SVG rendering utilities.
 * Builds SVG strings programmatically — no DOM, no JSX, no dependencies.
 */

export interface SVGRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface SVGText {
  x: number;
  y: number;
  content: string;
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  textAnchor?: "start" | "middle" | "end";
  fontWeight?: string;
}

export interface SVGAttributes {
  width: number;
  height: number;
  viewBox?: string;
  xmlns?: string;
}

/**
 * Create the opening SVG tag with attributes.
 */
export function openSVG(attrs: SVGAttributes): string {
  const viewBox = attrs.viewBox ?? `0 0 ${attrs.width} ${attrs.height}`;
  return `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${attrs.width}"
  height="${attrs.height}"
  viewBox="${viewBox}"
>`;
}

/**
 * Close the SVG tag.
 */
export function closeSVG(): string {
  return "</svg>";
}

/**
 * Render a rectangle element.
 */
export function rect(r: SVGRect): string {
  const parts = [`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"`];
  if (r.rx !== undefined) parts.push(` rx="${r.rx}"`);
  if (r.ry !== undefined) parts.push(` ry="${r.ry}"`);
  if (r.fill) parts.push(` fill="${escapeXml(r.fill)}"`);
  if (r.stroke) parts.push(` stroke="${escapeXml(r.stroke)}"`);
  if (r.strokeWidth !== undefined) parts.push(` stroke-width="${r.strokeWidth}"`);
  parts.push("/>");
  return parts.join("");
}

/**
 * Render a text element.
 */
export function text(t: SVGText): string {
  const parts = [
    `<text`,
    ` x="${t.x}"`,
    ` y="${t.y}"`,
    t.fill ? ` fill="${escapeXml(t.fill)}"` : "",
    t.fontSize ? ` font-size="${t.fontSize}"` : "",
    t.fontFamily ? ` font-family="${escapeXml(t.fontFamily)}"` : "",
    t.textAnchor ? ` text-anchor="${t.textAnchor}"` : "",
    t.fontWeight ? ` font-weight="${t.fontWeight}"` : "",
    `>`,
    `${escapeXml(t.content)}`,
    `</text>`,
  ];
  return parts.join("");
}

/**
 * Render a group element with optional attributes.
 */
export function group(
  content: string,
  transform?: string,
  fill?: string
): string {
  const attrs: string[] = [];
  if (transform) attrs.push(` transform="${escapeXml(transform)}"`);
  if (fill) attrs.push(` fill="${escapeXml(fill)}"`);
  return `<g${attrs.join("")}>${content}</g>`;
}

/**
 * Render a tooltip/title element.
 */
export function tooltip(title: string): string {
  return `<title>${escapeXml(title)}</title>`;
}

/**
 * Render a <style> block.
 */
export function styleBlock(css: string): string {
  return `<style>${css}</style>`;
}

/**
 * Render a foreignObject for HTML content.
 */
export function foreignObject(
  x: number,
  y: number,
  width: number,
  height: number,
  content: string
): string {
  return `<foreignObject x="${x}" y="${y}" width="${width}" height="${height}">${content}</foreignObject>`;
}

/**
 * Escape XML special characters.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Create a full SVG response with proper headers.
 */
export function svgResponse(svgContent: string): Response {
  return new Response(svgContent, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=900",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
