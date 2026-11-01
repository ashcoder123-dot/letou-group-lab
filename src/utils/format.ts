export const percent = (value: number | null | undefined, digits = 1) =>
  value == null ? "—" : `${(value * 100).toFixed(digits)}%`;
export const points = (value: number | null | undefined) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;
export const number = (value: number) => String(value).padStart(2, "0");
export const integer = (value: number | null | undefined) =>
  value == null ? "—" : value.toLocaleString("zh-CN");
export const statusLabel = (status: string) =>
  ({
    insufficient: "样本不足",
    above_baseline: "区间高于基线",
    observe: "继续观察",
  })[status] || "继续观察";
