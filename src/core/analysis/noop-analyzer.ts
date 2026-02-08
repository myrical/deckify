import type { DeckAnalyzer, AnalysisInput, Anomaly } from "./types";
import type { SlideData } from "@/core/deck/types";

/**
 * NoopAnalyzer — MVP implementation.
 * Returns null for all analysis, resulting in no AI slides or commentary.
 * Swap with ClaudeAnalyzer post-MVP.
 */
export class NoopAnalyzer implements DeckAnalyzer {
  async generateExecutiveSummary(_input: AnalysisInput): Promise<string | null> {
    return null;
  }

  async generateSlideCommentary(
    _slide: SlideData,
    _input: AnalysisInput
  ): Promise<string | null> {
    return null;
  }

  async detectAnomalies(_input: AnalysisInput): Promise<Anomaly[] | null> {
    return null;
  }
}
