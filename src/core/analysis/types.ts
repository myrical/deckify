/**
 * DeckAnalyzer Interface (Pluggable AI Analysis)
 *
 * MVP ships with NoopAnalyzer (returns null, no API calls).
 * Post-MVP swaps in ClaudeAnalyzer with zero changes to existing code.
 */

import type { AccountSummary } from "@/core/ad-platforms/types";
import type { SlideData } from "@/core/deck/types";

export interface AnalysisInput {
  accounts: AccountSummary[];
  userContext?: string; // optional text from questionnaire
}

export interface Anomaly {
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric?: string;
  campaignName?: string;
}

export interface DeckAnalyzer {
  /** Generate executive summary narrative from account data */
  generateExecutiveSummary(input: AnalysisInput): Promise<string | null>;

  /** Generate 1-2 sentence commentary for a specific slide */
  generateSlideCommentary(
    slide: SlideData,
    input: AnalysisInput
  ): Promise<string | null>;

  /** Detect anomalies, risks, and opportunities in the data */
  detectAnomalies(input: AnalysisInput): Promise<Anomaly[] | null>;
}
