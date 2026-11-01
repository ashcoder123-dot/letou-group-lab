import type { Draw, AnalysisResult } from "../types/lottery";
export interface HistoryBundle {
  version: 1;
  source: "official";
  updatedAt: string;
  draws: Draw[];
}
export function normalizeDraws(rows: unknown): Draw[];
export function validateHistoryBundle(raw: unknown): HistoryBundle;
export function historyMetadata(bundle: HistoryBundle, now?: number): AnalysisResult["meta"];
