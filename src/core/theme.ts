import type { Theme, ThemeColors, ThemeName } from "../types/index.js";

/**
 * Theme Engine — manages color palettes for SVG rendering.
 */

const themes: Record<ThemeName, Theme> = {
  "github-light": {
    name: "github-light",
    label: "GitHub Light",
    colors: {
      background: "#ffffff",
      text: "#1f2328",
      border: "#d0d7de",
      cells: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
      monthLabel: "#656d76",
      dayLabel: "#656d76",
    },
  },
  "github-dark": {
    name: "github-dark",
    label: "GitHub Dark",
    colors: {
      background: "#0d1117",
      text: "#e6edf3",
      border: "#30363d",
      cells: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
      monthLabel: "#8b949e",
      dayLabel: "#8b949e",
    },
  },
  dracula: {
    name: "dracula",
    label: "Dracula",
    colors: {
      background: "#282a36",
      text: "#f8f8f2",
      border: "#44475a",
      cells: ["#282a36", "#6272a4", "#bd93f9", "#ff79c6", "#ff5555"],
      monthLabel: "#f1fa8c",
      dayLabel: "#6272a4",
    },
  },
  nord: {
    name: "nord",
    label: "Nord",
    colors: {
      background: "#2e3440",
      text: "#eceff4",
      border: "#4c566a",
      cells: ["#2e3440", "#3b4252", "#434c5e", "#4c566a", "#81a1c1"],
      monthLabel: "#88c0d0",
      dayLabel: "#81a1c1",
    },
  },
  catppuccin: {
    name: "catppuccin",
    label: "Catppuccin Mocha",
    colors: {
      background: "#1e1e2e",
      text: "#cdd6f4",
      border: "#313244",
      cells: ["#1e1e2e", "#45475a", "#585b70", "#a6e3a1", "#94e2d5"],
      monthLabel: "#89b4fa",
      dayLabel: "#6c7086",
    },
  },
  "tokyo-night": {
    name: "tokyo-night",
    label: "Tokyo Night",
    colors: {
      background: "#1a1b26",
      text: "#a9b1d6",
      border: "#565f89",
      cells: ["#1a1b26", "#1f2335", "#414868", "#7aa2f7", "#bb9af7"],
      monthLabel: "#7dcfff",
      dayLabel: "#565f89",
    },
  },
  monokai: {
    name: "monokai",
    label: "Monokai",
    colors: {
      background: "#272822",
      text: "#f8f8f2",
      border: "#49483e",
      cells: ["#272822", "#49483e", "#a6e22e", "#a6e22e", "#66d9ef"],
      monthLabel: "#f92672",
      dayLabel: "#e6db74",
    },
  },
  "solarized-light": {
    name: "solarized-light",
    label: "Solarized Light",
    colors: {
      background: "#fdf6e3",
      text: "#586e75",
      border: "#eee8d5",
      cells: ["#fdf6e3", "#eee8d5", "#93a1a1", "#859900", "#2aa198"],
      monthLabel: "#268bd2",
      dayLabel: "#657b83",
    },
  },
};

/**
 * Get all available themes.
 */
export function getAllThemes(): Theme[] {
  return Object.values(themes);
}

/**
 * Get available theme names.
 */
export function getThemeNames(): ThemeName[] {
  return Object.keys(themes) as ThemeName[];
}

/**
 * Get a theme by name, falling back to GitHub Dark if not found.
 */
export function getTheme(name?: string): Theme {
  if (name && name in themes) {
    return themes[name as ThemeName];
  }
  return themes["github-dark"];
}

/**
 * Register a custom theme.
 */
export function registerTheme(theme: Theme): void {
  themes[theme.name as ThemeName] = theme;
}

export type { Theme, ThemeColors, ThemeName };
