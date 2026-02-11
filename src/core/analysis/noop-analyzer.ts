import type { DeckAnalyzer, Anomaly } from "./types";

/**
 * NoopAnalyzer — MVP implementation.
 * Returns null for all analysis, resulting in no AI slides or commentary.
 * Swap with ClaudeAnalyzer post-MVP.
 */
export class NoopAnalyzer implements DeckAnalyzer {
  async generateExecutiveSummary(): Promise<string | null> {
    return null;
  }

  async generateSlideCommentary(): Promise<string | null> {
    return null;
  }

  async detectAnomalies(): Promise<Anomaly[] | null> {
    return null;
  }
}
