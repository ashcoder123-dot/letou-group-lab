import { onBeforeUnmount, ref, watch } from "vue";
import { validateHistoryBundle, type HistoryBundle } from "../lib/history.mjs";
import type { AnalysisResult, Area } from "../types/lottery";

export function useAnalysis() {
  const area = ref<Area>("front");
  const limit = ref(100);
  const data = ref<AnalysisResult | null>(null);
  const loading = ref(false);
  const error = ref("");
  let history: HistoryBundle | null = null;
  let controller: AbortController | null = null;
  let worker: Worker | null = null;
  let requestId = 0;

  const load = async (refresh = false) => {
    const id = ++requestId;
    controller?.abort();
    worker?.terminate();
    const current = new AbortController();
    controller = current;
    loading.value = true;
    error.value = "";
    const timeout = window.setTimeout(() => current.abort("timeout"), 30000);
    try {
      if (!history || refresh) {
        const response = await fetch(`${import.meta.env.BASE_URL}data/history.json`, {
          signal: current.signal,
          cache: "no-cache",
        });
        if (!response.ok) throw new Error("暂时无法读取本站开奖数据，请稍后重试。");
        const incoming = validateHistoryBundle(await response.json());
        if (id !== requestId) return;
        history = incoming;
      }
      if (id !== requestId) return;
      const active = new Worker(new URL("../workers/analysis.worker.ts", import.meta.url), { type: "module" });
      worker = active;
      const result = await new Promise<AnalysisResult>((resolve, reject) => {
        active.onmessage = (event) => {
          if (event.data.id !== id) return;
          if (event.data.type === "error") reject(new Error(event.data.message));
          else resolve(event.data.data);
        };
        active.onerror = () => reject(new Error("浏览器分析暂未完成，请重新读取数据。"));
        current.signal.addEventListener("abort", () => reject(new Error("分析已取消。")), { once: true });
        active.postMessage({ id, area: area.value, limit: limit.value, history });
      });
      if (id === requestId) data.value = result;
    } catch (cause) {
      if (id !== requestId) return;
      if (current.signal.aborted && current.signal.reason !== "timeout") return;
      error.value =
        current.signal.reason === "timeout"
          ? "读取或计算超时，请稍后重试。"
          : cause instanceof TypeError
            ? "网络连接失败，请稍后重新读取数据。"
            : cause instanceof Error
              ? cause.message
              : "暂时无法完成分析。";
    } finally {
      window.clearTimeout(timeout);
      if (id === requestId) {
        worker?.terminate();
        worker = null;
        loading.value = false;
      }
    }
  };

  watch(
    [area, limit],
    () => {
      data.value = null;
      void load();
    },
    { immediate: true },
  );
  onBeforeUnmount(() => {
    ++requestId;
    controller?.abort();
    worker?.terminate();
  });
  return {
    area,
    limit,
    data,
    loading,
    error,
    load,
  };
}
