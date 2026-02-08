import type { DesignTokens } from "./types";

/**
 * Default design tokens for Prism-generated decks.
 * Professional, clean, dark-on-light with a blue accent.
 */
export const defaultDesignTokens: DesignTokens = {
  colors: {
    primary: "#1a1a2e",    // Dark navy — headings, titles
    secondary: "#16213e",  // Slightly lighter navy — subtitles
    accent: "#0f3460",     // Deep blue — accents, highlights
    background: "#ffffff", // White — slide backgrounds
    surface: "#f8f9fa",    // Light gray — card backgrounds, alt rows
    text: "#1a1a2e",       // Dark navy — body text
    textSecondary: "#6c757d", // Gray — secondary text, labels
    positive: "#198754",   // Green — positive trends
    negative: "#dc3545",   // Red — negative trends
  },
  fonts: {
    heading: "Helvetica Neue",
    body: "Helvetica Neue",
    mono: "Courier New",
  },
  chart: {
    palette: [
      "#0f3460", // Deep blue
      "#e94560", // Coral red
      "#533483", // Purple
      "#0ea5e9", // Sky blue
      "#f59e0b", // Amber
      "#10b981", // Emerald
      "#8b5cf6", // Violet
      "#ec4899", // Pink
    ],
    gridColor: "#e5e7eb",
    labelSize: 10,
  },
};
