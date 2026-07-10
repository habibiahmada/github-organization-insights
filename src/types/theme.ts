/** A color theme for the contribution graph */
export interface Theme {
  name: string;
  label: string;
  colors: ThemeColors;
}

export interface ThemeColors {
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Day cell border */
  border: string;
  /** Day cell colors for levels 0-4 */
  cells: [string, string, string, string, string];
  /** Month label color */
  monthLabel: string;
  /** Day label color */
  dayLabel: string;
}

export type ThemeName =
  | "github-light"
  | "github-dark"
  | "dracula"
  | "nord"
  | "catppuccin"
  | "tokyo-night"
  | "monokai"
  | "solarized-light";
