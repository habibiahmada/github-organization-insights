/**
 * GitHub Organization Insights (org-graph)
 *
 * Dynamic SVG analytics engine for GitHub organizations.
 *
 * Entry point for the Hono web server.
 *
 * Usage:
 *   GITHUB_TOKEN=your_token bun run src/index.ts
 *
 * Environment variables:
 *   GITHUB_TOKEN  - GitHub Personal Access Token (required)
 *   PORT          - Server port (default: 3000)
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { etag } from "hono/etag";
import { handleGraphRequest } from "./api/graph.js";
import { handleStatsRequest } from "./api/stats.js";
import { handleReposRequest } from "./api/repos.js";
import { setDefaultToken } from "./auth/index.js";
import { getToken } from "./auth/index.js";
import { getGitHubToken } from "./utils/index.js";
import { getAllThemes } from "./core/theme.js";
import { OrganizationService } from "./github/organization.js";

// Initialize default token from environment
const token = getGitHubToken();
if (token) {
  setDefaultToken(token);
  console.log("✓ GitHub token configured");
} else {
  console.warn(
    "⚠ GITHUB_TOKEN not set. Set it via environment variable for API access.",
  );
}

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", etag());

// ============================================================
// API Routes
// ============================================================

/**
 * GET /api/graph
 *
 * Contribution graph SVG for an organization.
 *
 * Example:
 *   /api/graph?org=vercel&theme=github-dark&year=2026
 */
app.get("/api/graph", handleGraphRequest);

/**
 * GET /api/stats
 *
 * Statistics card SVG for an organization.
 *
 * Example:
 *   /api/stats?org=vercel&theme=tokyo-night&year=2026
 */
app.get("/api/stats", handleStatsRequest);

/**
 * GET /api/repos
 *
 * Repository list for an organization.
 *
 * Example:
 *   /api/repos?org=vercel
 */
app.get("/api/repos", handleReposRequest);

/**
 * GET /api/themes
 *
 * List available themes.
 */
app.get("/api/themes", (c) => {
  const themes = getAllThemes().map((t) => ({
    name: t.name,
    label: t.label,
  }));

  return c.json({
    themes,
    default: "github-dark",
    count: themes.length,
  });
});

app.get("/api/org", async (c) => {
  const org = c.req.query("org");

  if (!org) {
    return c.json({ error: "Missing required parameter: org" }, 400);
  }

  const token = getToken(c.req.header("Authorization")) || getGitHubToken();
  if (!token) {
    return c.json({ error: "GitHub token not configured." }, 401);
  }

  try {
    const service = new OrganizationService(token);
    const organization = await service.getOrganization(org);
    if (!organization) {
      return c.json({ error: `Organization ${org} not found` }, 404);
    }

    const createdYear = new Date(organization.createdAt).getFullYear();
    return c.json({
      org: organization.login,
      createdAt: organization.createdAt,
      createdYear,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

/**
 * GET /api/health
 *
 * Health check endpoint.
 */
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    version: "0.1.0",
    tokenConfigured: !!token,
    uptime: process.uptime(),
  });
});

// ============================================================
// Root Route — HTML Demo Page
// ============================================================

app.get("/", async (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Organization Insights</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='14' font-size='14'>📊</text></svg>">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #0d1117;
      color: #e6edf3;
      min-height: 100vh;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #58a6ff, #bc8cff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle { color: #8b949e; font-size: 14px; margin-bottom: 32px; }
    .section { margin-bottom: 40px; }
    h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #f0f6fc;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .card h3 { font-size: 14px; color: #8b949e; margin-bottom: 12px; font-weight: 500; }
    code {
      background: #1c2128;
      border: 1px solid #30363d;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 13px;
      color: #f0f6fc;
    }
    pre {
      background: #1c2128;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
      color: #8b949e;
    }
    .demo-image {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 16px;
      max-width: 100%;
      overflow: auto;
    }
    .demo-image img { display: block; max-width: 100%; }
    .endpoint-list { list-style: none; }
    .endpoint-list li {
      padding: 12px 0;
      border-bottom: 1px solid #21262d;
    }
    .endpoint-list li:last-child { border-bottom: none; }
    .endpoint-method {
      display: inline-block;
      background: #1f6feb;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 8px;
    }
    .endpoint-path {
      color: #58a6ff;
      font-family: monospace;
      font-size: 13px;
    }
    .endpoint-desc {
      color: #8b949e;
      font-size: 12px;
      margin-top: 4px;
      margin-left: 52px;
    }
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 8px;
    }
    .theme-chip {
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .theme-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .demo-inner {
      display: grid;
      grid-template-columns: minmax(0, 2.5fr) minmax(230px, 1fr);
      gap: 18px;
      align-items: start;
    }
    .demo-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .demo-card {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 18px;
      padding: 18px;
    }
    .demo-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .demo-actions label,
    .filter-group label {
      color: #8b949e;
      font-size: 13px;
    }
    .demo-actions input,
    .demo-actions select,
    .filter-group select {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #f0f6fc;
      padding: 8px 10px;
      font-size: 13px;
    }
    .demo-image {
      background: #010409;
      border: 1px solid #262b33;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .demo-image img {
      max-width: 100%;
      display: block;
      border-radius: 12px;
      background: #010409;
    }
    .year-sidebar {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 18px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .year-sidebar h3 {
      margin: 0;
      color: #c9d1d9;
      font-size: 14px;
    }
    .year-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      max-height: 280px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .year-item {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 10px 12px;
      color: #8b949e;
      font-size: 13px;
      text-align: center;
      cursor: pointer;
    }
    .year-item.active {
      background: #238636;
      border-color: #2ea043;
      color: #f0fff4;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .footer {
      text-align: center;
      color: #484f58;
      font-size: 12px;
      padding: 32px 0;
    }
    .footer a { color: #58a6ff; text-decoration: none; }
    a { color: #58a6ff; }
  </style>
</head>
<body>
  <div class="container">
    <h1>GitHub Organization Insights</h1>
    <p class="subtitle">Dynamic SVG analytics engine for GitHub organizations — embed anywhere.</p>

    <div class="section">
      <h2>Try It</h2>
      <div class="card">
        <div class="demo-inner">
          <div class="demo-panel">
            <div class="demo-actions">
              <label>Organization:</label>
              <input id="orgInput" type="text" value="vercel" placeholder="e.g. vercel">
              <label>Theme:</label>
              <select id="themeSelect">
                <option value="github-dark">GitHub Dark</option>
                <option value="github-light">GitHub Light</option>
                <option value="dracula">Dracula</option>
                <option value="nord">Nord</option>
                <option value="catppuccin">Catppuccin</option>
                <option value="tokyo-night">Tokyo Night</option>
                <option value="monokai">Monokai</option>
                <option value="solarized-light">Solarized Light</option>
              </select>
              <button onclick="updateDemo()"
                style="background: #238636; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 13px; cursor: pointer;">
                Update
              </button>
            </div>
            <div class="demo-image">
              <img id="demoGraph" src="/api/graph?org=vercel&theme=github-dark" alt="Contribution Graph">
            </div>
          </div>
          <div class="year-sidebar">
            <h3>Year Filter</h3>
            <div class="filter-group">
              <label for="memberSelect">Data Scope</label>
              <select id="memberSelect">
                <option value="all">All Organization Data</option>
                <option value="member">Member-only Data</option>
                <option value="public">Public Only</option>
              </select>
            </div>
            <h3>Available Years</h3>
            <div id="yearList" class="year-list"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>API Endpoints</h2>
      <div class="card">
        <ul class="endpoint-list">
          <li>
            <span class="endpoint-method">GET</span>
            <span class="endpoint-path">/api/graph?org=&lt;org&gt;</span>
            <div class="endpoint-desc">Contribution graph SVG — the main heatmap. Supports theme, year, repo, and scores parameters.</div>
          </li>
          <li>
            <span class="endpoint-method">GET</span>
            <span class="endpoint-path">/api/stats?org=&lt;org&gt;</span>
            <div class="endpoint-desc">Statistics card SVG — total contributions, streaks, averages, and more.</div>
          </li>
          <li>
            <span class="endpoint-method">GET</span>
            <span class="endpoint-path">/api/repos?org=&lt;org&gt;</span>
            <div class="endpoint-desc">Repository list (JSON). Add &format=svg for an SVG version.</div>
          </li>
          <li>
            <span class="endpoint-method">GET</span>
            <span class="endpoint-path">/api/themes</span>
            <div class="endpoint-desc">List all available themes with their names.</div>
          </li>
          <li>
            <span class="endpoint-method">GET</span>
            <span class="endpoint-path">/api/health</span>
            <div class="endpoint-desc">Health check with status, version, and token configuration info.</div>
          </li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Parameters</h2>
      <div class="card">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #30363d;">
              <th style="text-align: left; padding: 8px 12px; color: #8b949e; font-weight: 500;">Parameter</th>
              <th style="text-align: left; padding: 8px 12px; color: #8b949e; font-weight: 500;">Type</th>
              <th style="text-align: left; padding: 8px 12px; color: #8b949e; font-weight: 500;">Default</th>
              <th style="text-align: left; padding: 8px 12px; color: #8b949e; font-weight: 500;">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #21262d;">
              <td style="padding: 8px 12px;"><code>org</code></td>
              <td style="padding: 8px 12px; color: #8b949e;">string</td>
              <td style="padding: 8px 12px; color: #8b949e;">—</td>
              <td style="padding: 8px 12px; color: #e6edf3;">GitHub organization name</td>
            </tr>
            <tr style="border-bottom: 1px solid #21262d;">
              <td style="padding: 8px 12px;"><code>theme</code></td>
              <td style="padding: 8px 12px; color: #8b949e;">string</td>
              <td style="padding: 8px 12px; color: #8b949e;"><code>github-dark</code></td>
              <td style="padding: 8px 12px; color: #e6edf3;">Color theme name</td>
            </tr>
            <tr style="border-bottom: 1px solid #21262d;">
              <td style="padding: 8px 12px;"><code>year</code></td>
              <td style="padding: 8px 12px; color: #8b949e;">number</td>
              <td style="padding: 8px 12px; color: #8b949e;"><code>current</code></td>
              <td style="padding: 8px 12px; color: #e6edf3;">Target year (2000-2027)</td>
            </tr>
            <tr style="border-bottom: 1px solid #21262d;">
              <td style="padding: 8px 12px;"><code>repo</code></td>
              <td style="padding: 8px 12px; color: #8b949e;">string</td>
              <td style="padding: 8px 12px; color: #8b949e;">—</td>
              <td style="padding: 8px 12px; color: #e6edf3;">Filter by repository name</td>
            </tr>
            <tr style="border-bottom: 1px solid #21262d;">
              <td style="padding: 8px 12px;"><code>scope</code></td>
              <td style="padding: 8px 12px; color: #8b949e;">string</td>
              <td style="padding: 8px 12px; color: #8b949e;">all</td>
              <td style="padding: 8px 12px; color: #e6edf3;">Data scope: &#96;all&#96;, &#96;member&#96;, or &#96;public&#96;</td>
            </tr>
            <tr style="border-bottom: 1px solid #21262d;">
              <td style="padding: 8px 12px;"><code>scores</code></td>
              <td style="padding: 8px 12px; color: #8b949e;">string</td>
              <td style="padding: 8px 12px; color: #8b949e;"><code>1,3,2,5,2,2,1</code></td>
              <td style="padding: 8px 12px; color: #e6edf3;">Custom weights: commit,pr,issue,release,discussion,review,comment</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px;"><code>compact</code></td>
              <td style="padding: 8px 12px; color: #8b949e;">boolean</td>
              <td style="padding: 8px 12px; color: #8b949e;"><code>false</code></td>
              <td style="padding: 8px 12px; color: #e6edf3;">Show compact version (no labels)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2>Embed Examples</h2>
      <div class="card">
        <h3>Markdown (GitHub README)</h3>
        <pre>![Contribution Graph](https://org-graph.dev/api/graph?org=vercel&theme=github-dark)

![Statistics](https://org-graph.dev/api/stats?org=vercel)

![Top Repositories](https://org-graph.dev/api/repos?org=vercel&format=svg)</pre>
      </div>
      <div class="card">
        <h3>HTML</h3>
        <pre>&lt;img src="https://org-graph.dev/api/graph?org=vercel&theme=tokyo-night&year=2026" alt="Contributions" /&gt;</pre>
      </div>
    </div>

    <div class="footer">
      <p>Built with <a href="https://hono.dev">Hono</a> + <a href="https://bun.sh">Bun</a> • <a href="https://github.com">Open Source</a> • Data from <a href="https://docs.github.com/en/rest">GitHub API</a></p>
    </div>
  </div>

  <script>
    function updateDemo() {
      const org = document.getElementById('orgInput').value.trim() || 'vercel';
      const theme = document.getElementById('themeSelect').value;
      const year = document.querySelector('.year-item.active')?.textContent || new Date().getFullYear();
      const memberScope = document.getElementById('memberSelect').value;
      const img = document.getElementById('demoGraph');
      img.src = '/api/graph?org=' + encodeURIComponent(org) + '&theme=' + encodeURIComponent(theme) + '&year=' + encodeURIComponent(year) + '&scope=' + encodeURIComponent(memberScope) + '&nocache=' + Date.now();
    }

    function setActiveYear(yearElement) {
      const items = document.querySelectorAll('.year-item');
      items.forEach((item) => item.classList.remove('active'));
      yearElement.classList.add('active');
    }

    async function populateYearSelect() {
      const list = document.getElementById('yearList');
      if (!list) return;

      const org = document.getElementById('orgInput').value.trim() || 'vercel';
      const currentYear = new Date().getFullYear();
      const defaultMinYear = currentYear - 2;
      let minYear = defaultMinYear;

      try {
        const response = await fetch('/api/org?org=' + encodeURIComponent(org));
        const data = await response.json();
        if (response.ok && data.createdYear) {
          minYear = Math.max(2000, data.createdYear);
        }
      } catch {
        // fallback to last 2 years if API call fails
      }

      list.innerHTML = '';
      for (let year = currentYear; year >= minYear; year--) {
        const item = document.createElement('div');
        item.className = 'year-item';
        item.textContent = String(year);
        item.onclick = () => {
          setActiveYear(item);
          updateDemo();
        };
        list.appendChild(item);
      }

      const defaultItem = list.querySelector('.year-item');
      if (defaultItem) {
        setActiveYear(defaultItem);
      }
    }

    async function refreshYears() {
      await populateYearSelect();
    }

    document.getElementById('orgInput').addEventListener('change', refreshYears);
    document.getElementById('orgInput').addEventListener('blur', refreshYears);

    populateYearSelect();
  </script>
</body>
</html>`;

  return c.html(html);
});

// ============================================================
// Start Server
// ============================================================

const portStr = String(parseInt(process.env.PORT ?? "3000", 10));
const port = parseInt(portStr, 10);

console.log(`
  ╔══════════════════════════════════════════════╗
  ║     GitHub Organization Insights v0.1.0      ║
  ║                                              ║
  ║  → http://localhost:${portStr.padStart(4)}/                 ║
  ║  → http://localhost:${portStr.padStart(4)}/api/graph?org=vercel  ║
  ║                                              ║
  ╚══════════════════════════════════════════════╝
`);

export default {
  port,
  fetch: app.fetch,
};
