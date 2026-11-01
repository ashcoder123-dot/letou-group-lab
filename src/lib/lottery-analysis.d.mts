import type { AnalysisResult, Area, Draw } from "../types/lottery";
export function analyzeDraws(draws: Draw[], limit?: number, area?: Area): Omit<AnalysisResult, "meta">;
