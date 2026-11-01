export type Area = "front" | "back";
export type Page = "overview" | "history" | "library" | "method";

export interface Draw {
  drawNum: string;
  drawDate: string;
  reds: number[];
  blues: number[];
}

export interface Distribution {
  counts: number[];
  groupHits: number[][];
  groupSizes: number[];
  maxCluster: number;
  coverage: number;
  pattern: string;
}

export interface DrawAnalysis extends Draw {
  segment: "training" | "validation";
  metrics: {
    sum: number;
    span: number;
    ac: number;
    oddCount: number;
    consecutivePairs: number;
  };
  distributions: Record<string, Distribution | null>;
}

export interface SegmentMetrics {
  sampleCount: number;
  retainedCount: number;
  retention: number | null;
  baseline: number | null;
  lift: number | null;
  confidenceLow: number | null;
  confidenceHigh: number | null;
}

export interface Candidate {
  threshold: number;
  training: SegmentMetrics;
  validation: SegmentMetrics;
  overall: SegmentMetrics;
}

export interface RuleReport {
  key: string;
  title: string;
  description: string;
  category: "static" | "recent";
  lookback: number;
  threshold: number;
  condition: string;
  conditionSource: "training" | "preset";
  training: SegmentMetrics;
  validation: SegmentMetrics;
  overall: SegmentMetrics;
  status: "insufficient" | "above_baseline" | "observe";
  nextGroups: { label: string; numbers: number[] }[] | null;
  nextBaseline: number | null;
  compression: number | null;
  retainedCombinations: number | null;
  totalCombinations: number;
  patterns: { pattern: string; count: number; percentage: number }[];
  candidates: Candidate[];
}

export interface AnalysisResult {
  area: Area;
  requestedCount: number;
  sampleCount: number;
  trainingCount: number;
  validationCount: number;
  latestDraw: Draw;
  oldestDraw: Draw;
  ruleCount: number;
  meta: {
    source: "official" | "import";
    mode: "live" | "cache" | "import" | "snapshot";
    updatedAt: string;
    isStale: boolean;
    warning: string | null;
    storedCount: number;
    latestDrawNum: string;
    latestDrawDate: string;
  };
  rules: RuleReport[];
  draws: DrawAnalysis[];
  numberStats: {
    number: number;
    frequency: number;
    omission: number;
    omissionCensored: boolean;
  }[];
  methodology: {
    selection: string;
    baseline: string;
    interpretation: string;
    comparison: string;
  };
}
