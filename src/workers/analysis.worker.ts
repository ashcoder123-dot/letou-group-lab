import { analyzeDraws } from "../lib/lottery-analysis.mjs";
import { historyMetadata, type HistoryBundle } from "../lib/history.mjs";
import type { Area } from "../types/lottery";

interface AnalysisRequest {
  id: number;
  area: Area;
  limit: number;
  history: HistoryBundle;
}

self.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  const { id, area, limit, history } = event.data;
  try {
    if (!Number.isInteger(limit) || limit < 10 || limit > 200
      || (area !== "front" && area !== "back")) throw new Error("分析参数无效。");
    const data = { ...analyzeDraws(history.draws, limit, area), meta: historyMetadata(history) };
    self.postMessage({ id, type: "result", data });
  } catch (cause) {
    self.postMessage({ id, type: "error", message: cause instanceof Error ? cause.message : "分组分析失败。" });
  }
};
