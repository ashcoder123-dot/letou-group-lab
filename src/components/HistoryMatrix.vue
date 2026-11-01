<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { AnalysisResult, DrawAnalysis } from "../types/lottery";
import { number } from "../utils/format";
import LotteryBalls from "./LotteryBalls.vue";

const props = defineProps<{ data: AnalysisResult; selectedKey: string }>();
const search = ref("");
const onlyValidation = ref(false);
const ruleFilter = ref("all");
const page = ref(1);
const selectedIssue = ref(props.data.draws[0]?.drawNum || "");
const detailElement = ref<HTMLElement | null>(null);
const rules = computed(() =>
  ruleFilter.value === "all"
    ? props.data.rules
    : props.data.rules.filter((rule) => rule.key === ruleFilter.value),
);
const filtered = computed(() =>
  props.data.draws.filter(
    (draw) =>
      draw.drawNum.includes(search.value.trim()) &&
      (!onlyValidation.value || draw.segment === "validation"),
  ),
);
const pageCount = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / 20)),
);
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * 20, page.value * 20),
);
const selectedDraw = computed(
  () =>
    props.data.draws.find((draw) => draw.drawNum === selectedIssue.value) ||
    props.data.draws[0]!,
);
const selectDraw = (draw: DrawAnalysis) => {
  selectedIssue.value = draw.drawNum;
  detailElement.value?.scrollIntoView({ behavior: "smooth", block: "start" });
};
watch([search, onlyValidation, ruleFilter, () => props.data], () => {
  page.value = 1;
});
</script>

<template>
  <section class="panel history-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">DRAW-BY-DRAW MATRIX</span>
        <h2>每期开奖 × 每种分组规律</h2>
        <p>
          每格按图鉴中的组顺序显示数量比；保留与排除均使用该规律固定的研究条件。
        </p>
      </div>
    </div>
    <div class="matrix-toolbar">
      <input
        v-model="search"
        type="search"
        placeholder="搜索期号"
        aria-label="搜索期号"
      /><select v-model="ruleFilter" aria-label="筛选分组规律">
        <option value="all">全部 {{ data.ruleCount }} 种规律</option>
        <option v-for="rule in data.rules" :key="rule.key" :value="rule.key">
          {{ rule.title }}
        </option></select
      ><label class="checkbox-label"
        ><input v-model="onlyValidation" type="checkbox" />只看验证段</label
      ><span class="matrix-legend"
        ><i class="pass"></i>保留<i class="fail"></i>排除</span
      >
    </div>
    <div class="table-scroll matrix-scroll">
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="sticky-column">期号 / 开奖号码</th>
            <th v-for="rule in rules" :key="rule.key" :title="rule.description">
              {{ rule.title }}<small>{{ rule.condition }}</small>
            </th>
            <th>和值 / 跨度</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="draw in visible"
            :key="draw.drawNum"
            :class="{ 'selected-draw': selectedDraw.drawNum === draw.drawNum }"
          >
            <td class="sticky-column">
              <button class="draw-select" @click="selectDraw(draw)">
                <span class="draw-line"
                  ><b>{{ draw.drawNum }}期</b><small>{{ draw.drawDate }}</small
                  ><i v-if="draw.segment === 'validation'">验证</i></span
                ><LotteryBalls
                  :reds="data.area === 'front' ? draw.reds : undefined"
                  :blues="data.area === 'back' ? draw.blues : undefined"
                  compact
                />
              </button>
            </td>
            <td v-for="rule in rules" :key="rule.key">
              <button
                v-if="draw.distributions[rule.key]"
                :class="[
                  'distribution-cell',
                  draw.distributions[rule.key]!.maxCluster <= rule.threshold
                    ? 'kept'
                    : 'excluded',
                ]"
                @click="selectDraw(draw)"
              >
                <span>{{ draw.distributions[rule.key]!.pattern }}</span
                ><small>{{
                  draw.distributions[rule.key]!.maxCluster <= rule.threshold
                    ? "保留"
                    : "排除"
                }}</small></button
              ><span
                v-else
                class="unavailable-cell"
                title="该期开奖前的数据不足，未使用后续开奖补齐"
                >前置历史不足</span
              >
            </td>
            <td>
              <span class="metric-pair"
                >{{ draw.metrics.sum }}
                <small>/ {{ draw.metrics.span }}</small></span
              >
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!visible.length" class="empty-inline">
        没有符合筛选条件的开奖。
      </div>
    </div>
    <div class="pagination">
      <span>共 {{ filtered.length }} 期 · 每页20期 · 左右滑动查看全部规律</span>
      <div>
        <button :disabled="page === 1" @click="page--">上一页</button
        ><span>{{ page }} / {{ pageCount }}</span
        ><button :disabled="page >= pageCount" @click="page++">下一页</button>
      </div>
    </div>
  </section>

  <section ref="detailElement" class="panel draw-detail">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">DISTRIBUTION DETAILS</span>
        <h2>第 {{ selectedDraw.drawNum }} 期 · 全规律分布</h2>
        <p>
          {{ selectedDraw.drawDate }} ·
          点击上方任一期可切换；组内仅展示当期命中的号码。
        </p>
      </div>
      <LotteryBalls
        :reds="selectedDraw.reds"
        :blues="selectedDraw.blues"
        compact
      />
    </div>
    <div class="draw-feature-row">
      <span
        >和值 <b>{{ selectedDraw.metrics.sum }}</b></span
      ><span
        >跨度 <b>{{ selectedDraw.metrics.span }}</b></span
      ><span
        >奇偶
        <b
          >{{ selectedDraw.metrics.oddCount }}:{{
            (data.area === "front" ? 5 : 2) - selectedDraw.metrics.oddCount
          }}</b
        ></span
      ><span
        >AC值 <b>{{ selectedDraw.metrics.ac }}</b></span
      ><span
        >连号对 <b>{{ selectedDraw.metrics.consecutivePairs }}</b></span
      >
    </div>
    <div class="distribution-grid">
      <article
        v-for="rule in data.rules"
        :key="rule.key"
        class="distribution-card"
        :class="{ focused: rule.key === selectedKey }"
      >
        <header>
          <h3>{{ rule.title }}</h3>
          <span v-if="selectedDraw.distributions[rule.key]" class="mono">{{
            selectedDraw.distributions[rule.key]!.pattern
          }}</span>
        </header>
        <template v-if="selectedDraw.distributions[rule.key]"
          ><div
            v-for="(hits, i) in selectedDraw.distributions[rule.key]!.groupHits"
            :key="i"
            class="group-hit-row"
          >
            <span>{{ rule.nextGroups?.[i]?.label || `第${i + 1}组` }}</span>
            <div>
              <b v-for="n in hits" :key="n" class="hit-number">{{
                number(n)
              }}</b
              ><small v-if="!hits.length" class="empty-group">空组</small>
            </div>
            <small
              >{{ hits.length }} /
              {{ selectedDraw.distributions[rule.key]!.groupSizes[i] }}</small
            >
          </div>
          <footer>
            <span
              >覆盖
              {{ selectedDraw.distributions[rule.key]!.coverage }} 组</span
            ><span
              :class="
                selectedDraw.distributions[rule.key]!.maxCluster <=
                rule.threshold
                  ? 'text-green'
                  : 'text-orange'
              "
              >{{
                selectedDraw.distributions[rule.key]!.maxCluster <=
                rule.threshold
                  ? "符合保留条件"
                  : "被条件排除"
              }}</span
            >
          </footer></template
        >
        <p v-else class="muted-copy">
          此期开奖前不足 {{ rule.lookback }} 期记录，暂不计算。
        </p>
      </article>
    </div>
  </section>
</template>
