<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 });
const paths: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  chart: "M4 20h17 M7 16V9 M12 16V4 M17 16v-5",
  history: "M3 6v5h5 M3.5 10a8.5 8.5 0 1 1 2 7 M12 7v5l3 2",
  book: "M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z M13 7a3 3 0 0 1 3-3h5v15h-5a3 3 0 0 0-3 2",
  info: "M12 11v6 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  refresh:
    "M20 7v5h-5 M4 17v-5h5 M5.2 7a8 8 0 0 1 13.2-2L20 8 M4 16l1.6 3A8 8 0 0 0 18.8 17",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  upload: "M12 16V3 M7 8l5-5 5 5 M4 15v5h16v-5",
  chevron: "M9 5l7 7-7 7",
  close: "M6 6l12 12 M6 18L18 6",
  check: "M5 12l4 4L19 6",
  layers: "M12 3l10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  filter: "M4 5h16 M7 12h10 M10 19h4",
  clock: "M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
};
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.chart" />
  </svg>
</template>
